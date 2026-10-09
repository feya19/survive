import hashlib
import json
import logging
import uuid
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
from sqlalchemy import select, func, text
from sqlalchemy.orm import Session
from .core import settings
from .db import SessionLocal, Dataset, DatasetVersion, DatasetProfile, DatasetMapping, ValidationRun, TrainingJob, ModelVersion, ModelDeployment, now
from .pipeline import (
    read_dataset, digest, profile, suggest, validate_mapping, standardize, trusted,
    FIELDS, FEATURES, active_model, deploy, verify_model, active_movie_model_metadata,
    predict_movie_revenue as run_movie_revenue, MovieInputError, UnsupportedGenreError, ModelChangedError,
)
from .agent.schemas import ChatRequest, ChatResponse, MoviePredictionArguments, BudgetShockArguments
from .agent.orchestrator import ChatOrchestrator
from .analytics.movie_analytics import AnalyticsError, dataset_statistics, query_movie_analytics
from .analytics.schemas import MovieAnalyticsQuery
from .dashboards.templates import get_template, template_list

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')
app = FastAPI(title="Survive AI/ML API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings().cors_origins.split(",") if x.strip()], allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def correlation(request: Request, call_next):
    request.state.correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = request.state.correlation_id
    return response


def db_session():
    with SessionLocal() as db:
        yield db


def auth(x_service_token: str | None = Header(None)):
    if not settings().service_token or x_service_token != settings().service_token:
        raise HTTPException(401, "Invalid service token")


def get_or_404(db, cls, id):
    obj = db.get(cls, id)
    if not obj:
        raise HTTPException(404, "Resource not found")
    return obj


def latest_mapping(db, dataset_id):
    return db.scalar(select(DatasetMapping).where(DatasetMapping.dataset_id == dataset_id).order_by(DatasetMapping.revision.desc()))


def original(db, dataset_id):
    return db.scalar(select(DatasetVersion).where(DatasetVersion.dataset_id == dataset_id, DatasetVersion.kind == "original"))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready(db: Session = Depends(db_session)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        raise HTTPException(503, "Database unavailable")


@app.post("/api/v1/datasets", dependencies=[Depends(auth)], status_code=201)
async def upload(file: UploadFile = File(...), db: Session = Depends(db_session)):
    filename = Path(file.filename or "").name
    suffix = Path(filename).suffix.lower()
    if suffix not in {".csv", ".xlsx"}:
        raise HTTPException(422, "Only CSV and XLSX supported")
    dataset_id = str(uuid.uuid4())
    folder = settings().storage_root / "datasets" / dataset_id
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"original{suffix}"
    max_bytes = settings().max_upload_mb * 1024 * 1024
    count = 0
    try:
        with path.open("xb") as out:
            while chunk := await file.read(1024 * 1024):
                count += len(chunk)
                if count > max_bytes:
                    raise HTTPException(413, "Upload too large")
                out.write(chunk)
        if not count:
            raise ValueError("Empty file")
        if suffix == ".xlsx" and path.open("rb").read(4) != b"PK\x03\x04":
            raise ValueError("Invalid XLSX format")
        df = read_dataset(path)
        if df.empty or not len(df.columns) or any(not str(c).strip() for c in df.columns):
            raise ValueError("Empty or invalid dataset")
        if len(set(df.columns)) != len(df.columns):
            raise ValueError("Duplicate columns")
    except HTTPException:
        path.unlink(missing_ok=True)
        raise
    except Exception as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(422, f"Invalid dataset: {exc}")
    ds = Dataset(id=dataset_id, filename=filename)
    ver = DatasetVersion(dataset_id=dataset_id, version=1, kind="original", path=str(path), sha256=digest(path), row_count=len(df), column_count=len(df.columns))
    db.add_all([ds, ver])
    db.commit()
    return {"dataset_id": dataset_id, "version": 1, "filename": filename, "status": "uploaded", "row_count": len(df), "column_count": len(df.columns)}


@app.get("/api/v1/datasets/{dataset_id}/profile", dependencies=[Depends(auth)])
def dataset_profile(dataset_id: str, db: Session = Depends(db_session)):
    get_or_404(db, Dataset, dataset_id)
    ver = original(db, dataset_id)
    existing = db.scalar(select(DatasetProfile).where(DatasetProfile.dataset_version_id == ver.id))
    if existing:
        return existing.data
    data = profile(trusted(ver.path), dataset_id)
    db.add(DatasetProfile(dataset_version_id=ver.id, data=data))
    db.commit()
    return data


@app.post("/api/v1/datasets/{dataset_id}/mapping/suggest", dependencies=[Depends(auth)])
def mapping_suggest(dataset_id: str, db: Session = Depends(db_session)):
    data = dataset_profile(dataset_id, db)
    return suggest(data["columns"])


@app.get("/api/v1/datasets/{dataset_id}/statistics", dependencies=[Depends(auth)])
def dataset_statistics_endpoint(dataset_id: str, db: Session = Depends(db_session)):
    try:
        return dataset_statistics(db, dataset_id)
    except AnalyticsError as exc:
        raise HTTPException(exc.status_code, {"code": exc.code, "message": str(exc)})


@app.post("/api/v1/analytics/movie/query", dependencies=[Depends(auth)])
def movie_analytics_endpoint(body: MovieAnalyticsQuery, db: Session = Depends(db_session)):
    try:
        return query_movie_analytics(
            db,
            body.dataset_id,
            body.operation,
            body.genre,
            body.budget_bucket_size,
            body.max_points,
        )
    except AnalyticsError as exc:
        raise HTTPException(exc.status_code, {"code": exc.code, "message": str(exc)})


@app.get("/api/v1/dashboard/templates", dependencies=[Depends(auth)])
def dashboard_templates():
    return template_list()


@app.get("/api/v1/dashboard/templates/{template_id}", dependencies=[Depends(auth)])
def dashboard_template(template_id: str):
    template = get_template(template_id)
    if template is None:
        raise HTTPException(404, "Dashboard template not found")
    return template


@app.post("/api/v1/dashboard/widgets/query", dependencies=[Depends(auth)])
def dashboard_widget_query(body: MovieAnalyticsQuery, db: Session = Depends(db_session)):
    return movie_analytics_endpoint(body, db)


@app.post("/api/v1/dashboard/generate", dependencies=[Depends(auth)])
def dashboard_generate(body: ChatRequest, db: Session = Depends(db_session)):
    result = ChatOrchestrator().respond(db, body)
    if result.get("dashboard_spec") is None:
        raise HTTPException(422, {
            "code": result.get("dashboard_error", {}).get("code", "dashboard_not_generated"),
            "message": result["answer"],
            "tool_execution": result.get("tool_execution"),
            "needs_input": result.get("needs_input", False),
        })
    return {
        "dashboard_spec": result["dashboard_spec"],
        "answer": result["answer"],
        "tool_execution": result["tool_execution"],
    }


class MappingInput(BaseModel):
    mappings: list[dict]


@app.get("/api/v1/datasets/{dataset_id}/mapping", dependencies=[Depends(auth)])
def mapping_get(dataset_id: str, db: Session = Depends(db_session)):
    get_or_404(db, Dataset, dataset_id)
    mapping = latest_mapping(db, dataset_id)
    if not mapping:
        raise HTTPException(404, "Mapping not saved")
    return {"revision": mapping.revision, "approved": mapping.approved, **mapping.data}


@app.put("/api/v1/datasets/{dataset_id}/mapping", dependencies=[Depends(auth)])
def mapping_put(dataset_id: str, body: MappingInput, db: Session = Depends(db_session)):
    get_or_404(db, Dataset, dataset_id)
    source_columns = list(read_dataset(trusted(original(db, dataset_id).path), 1).columns)
    try:
        validate_mapping(body.model_dump(), source_columns)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    previous = latest_mapping(db, dataset_id)
    revision = (previous.revision + 1) if previous else 1
    mapping = DatasetMapping(dataset_id=dataset_id, revision=revision, data=body.model_dump())
    db.add(mapping)
    db.commit()
    return {"revision": revision, "approved": False, **mapping.data}


@app.post("/api/v1/datasets/{dataset_id}/mapping/approve", dependencies=[Depends(auth)])
def mapping_approve(dataset_id: str, db: Session = Depends(db_session)):
    mapping = latest_mapping(db, dataset_id)
    if not mapping:
        raise HTTPException(409, "Save mapping first")
    mapping.approved = True
    mapping.approved_at = now()
    db.commit()
    return {"revision": mapping.revision, "approved": True}


@app.post("/api/v1/datasets/{dataset_id}/validate", dependencies=[Depends(auth)])
def validate(dataset_id: str, db: Session = Depends(db_session)):
    get_or_404(db, Dataset, dataset_id)
    mapping = latest_mapping(db, dataset_id)
    if not mapping or not mapping.approved:
        raise HTTPException(409, "Approved mapping required")
    prior = db.scalar(select(ValidationRun).where(ValidationRun.dataset_id == dataset_id, ValidationRun.mapping_revision == mapping.revision, ValidationRun.status == "passed"))
    if prior:
        return {"dataset_id": dataset_id, "validation_status": "passed", "training_ready": True, "standardized_version_id": prior.standardized_version_id, **prior.report}
    source = original(db, dataset_id)
    version = db.scalar(select(func.count(DatasetVersion.id)).where(DatasetVersion.dataset_id == dataset_id, DatasetVersion.kind == "standardized")) + 1
    path = settings().storage_root / "datasets" / dataset_id / f"standardized_v{version}.csv"
    try:
        report = standardize(trusted(source.path), mapping.data, path)
    except Exception as exc:
        db.add(ValidationRun(dataset_id=dataset_id, mapping_revision=mapping.revision, status="failed", report={"errors": [str(exc)]}))
        db.commit()
        raise HTTPException(422, str(exc))
    ver = DatasetVersion(dataset_id=dataset_id, version=version, kind="standardized", path=str(path), sha256=digest(path), row_count=report["valid_rows"], column_count=len(read_dataset(path, 1).columns), mapping_revision=mapping.revision)
    db.add(ver)
    db.flush()
    db.add(ValidationRun(dataset_id=dataset_id, mapping_revision=mapping.revision, standardized_version_id=ver.id, status="passed", report=report))
    db.commit()
    return {"dataset_id": dataset_id, "validation_status": "passed", "training_ready": True, "standardized_version_id": ver.id, **report}


class TrainingInput(BaseModel):
    dataset_version_id: str
    model_type: str = "lgbm_revenue"
    target: str = "revenue"
    parameters: dict = Field(default_factory=dict)
    currency: Literal["USD"] = "USD"


@app.post("/api/v1/training/jobs", dependencies=[Depends(auth)], status_code=202)
def training_start(body: TrainingInput, idempotency_key: str | None = Header(None), db: Session = Depends(db_session)):
    if body.model_type != "lgbm_revenue" or body.target != "revenue" or set(body.parameters) - {"random_seed"} or body.currency != "USD":
        raise HTTPException(422, "Unsupported training configuration")
    if idempotency_key:
        prior = db.scalar(select(TrainingJob).where(TrainingJob.idempotency_key == idempotency_key))
        if prior:
            if prior.dataset_version_id != body.dataset_version_id or prior.parameters != {**body.parameters, "currency": body.currency}:
                raise HTTPException(409, "Idempotency key already used for another request")
            return {"job_id": prior.id, "status": prior.status}
    ver = get_or_404(db, DatasetVersion, body.dataset_version_id)
    mapping = latest_mapping(db, ver.dataset_id)
    if ver.kind != "standardized" or not mapping or not mapping.approved or mapping.revision != ver.mapping_revision:
        raise HTTPException(409, "Current approved validated dataset version required")
    if digest(trusted(ver.path)) != ver.sha256:
        raise HTTPException(409, "Dataset checksum mismatch")
    training_parameters = {**body.parameters, "currency": body.currency}
    job = TrainingJob(dataset_version_id=ver.id, model_type=body.model_type, target=body.target, parameters=training_parameters, idempotency_key=idempotency_key)
    db.add(job)
    db.commit()
    try:
        from .worker import train_job
        train_job.delay(job.id)
    except Exception as exc:
        job.status, job.error, job.finished_at = "failed", f"Queue unavailable: {type(exc).__name__}", now()
        db.commit()
        raise HTTPException(503, "Training queue unavailable")
    return {"job_id": job.id, "status": job.status}


@app.get("/api/v1/training/jobs/{job_id}", dependencies=[Depends(auth)])
def training_get(job_id: str, db: Session = Depends(db_session)):
    job = get_or_404(db, TrainingJob, job_id)
    return {"job_id": job.id, "status": job.status, "model_version_id": job.model_version_id, "metrics": job.metrics, "error": job.error}


def model_response(model):
    return {"id": model.id, "model_type": model.model_type, "status": model.status, "dataset_version_id": model.dataset_version_id, "mapping_revision": model.mapping_revision, "metrics": model.metrics, "manifest": model.manifest, "created_at": model.created_at}


@app.get("/api/v1/models", dependencies=[Depends(auth)])
def models_list(db: Session = Depends(db_session)):
    return [model_response(m) for m in db.scalars(select(ModelVersion).order_by(ModelVersion.created_at.desc())).all()]


@app.get("/api/v1/models/active", dependencies=[Depends(auth)])
def models_active(db: Session = Depends(db_session)):
    model = active_model(db)
    if not model:
        raise HTTPException(404, "No active model")
    return model_response(model)


@app.get("/api/v1/models/active/features", dependencies=[Depends(auth)])
def models_active_features(db: Session = Depends(db_session)):
    try:
        return active_movie_model_metadata(db)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except Exception as exc:
        raise HTTPException(503, f"Active model metadata unavailable: {type(exc).__name__}")


@app.get("/api/v1/models/{model_id}", dependencies=[Depends(auth)])
def models_get(model_id: str, db: Session = Depends(db_session)):
    return model_response(get_or_404(db, ModelVersion, model_id))


class Approval(BaseModel):
    approved_by: str = Field(min_length=1)
    approved: bool


@app.post("/api/v1/models/{model_id}/promote", dependencies=[Depends(auth)])
def promote(model_id: str, body: Approval, db: Session = Depends(db_session)):
    model = get_or_404(db, ModelVersion, model_id)
    if not body.approved or model.status != "candidate":
        raise HTTPException(409, "Candidate and explicit approval required")
    if not all(isinstance(model.metrics.get(k), (float, int)) for k in ("mae", "rmse")):
        raise HTTPException(409, "Evaluation gate failed")
    try:
        deploy(db, model, "promote", body.approved_by)
    except Exception as exc:
        raise HTTPException(409, f"Promotion verification failed: {exc}")
    return model_response(model)


@app.post("/api/v1/models/{model_id}/rollback", dependencies=[Depends(auth)])
def rollback(model_id: str, body: Approval, db: Session = Depends(db_session)):
    model = get_or_404(db, ModelVersion, model_id)
    deployed = db.scalar(select(ModelDeployment).where(ModelDeployment.model_version_id == model_id))
    if not body.approved or model.status != "archived" or not deployed:
        raise HTTPException(409, "Previously deployed model and approval required")
    try:
        deploy(db, model, "rollback", body.approved_by)
    except Exception as exc:
        raise HTTPException(409, f"Rollback verification failed: {exc}")
    return model_response(model)


@app.post("/api/v1/predictions/revenue", dependencies=[Depends(auth)])
def predict(features: dict, db: Session = Depends(db_session)):
    try:
        result = run_movie_revenue(db, features)
    except MovieInputError as exc:
        raise HTTPException(422, {"code": exc.code, "message": str(exc)})
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except Exception as exc:
        raise HTTPException(503, f"Inference unavailable: {type(exc).__name__}")
    return {"model_version": result["model_version"], "model_type": result["model_type"],
            "prediction_type": "point", "predicted_revenue": result["prediction"]["revenue"],
            "currency": result["currency"]}


@app.post("/api/v1/predictions/movie/revenue", dependencies=[Depends(auth)])
def predict_movie(body: MoviePredictionArguments, db: Session = Depends(db_session)):
    try:
        values = body.model_dump(mode="python")
        for field in ("budget", "planned_duration", "marketing_budget"):
            if values[field] is not None:
                values[field] = float(values[field])
        return run_movie_revenue(db, values)
    except MovieInputError as exc:
        raise HTTPException(422, {"code": exc.code, "message": str(exc)})
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except Exception as exc:
        raise HTTPException(503, f"Inference unavailable: {type(exc).__name__}")


@app.post("/api/v1/scenarios/movie/budget", dependencies=[Depends(auth)])
def simulate_movie_budget(body: BudgetShockArguments, db: Session = Depends(db_session)):
    from .agent.tools.movie_scenario import simulate_budget_shock_tool
    try:
        return simulate_budget_shock_tool(db, body)
    except MovieInputError as exc:
        raise HTTPException(422, {"code": exc.code, "message": str(exc)})
    except ModelChangedError as exc:
        raise HTTPException(409, {"code": exc.code, "message": str(exc)})
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except Exception as exc:
        raise HTTPException(503, f"Inference unavailable: {type(exc).__name__}")


@app.post("/api/v1/chat", response_model=ChatResponse, dependencies=[Depends(auth)])
def chat(body: ChatRequest, db: Session = Depends(db_session)):
    return ChatOrchestrator().respond(db, body)
