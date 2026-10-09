import hashlib
import json
import logging
import math
import re
from difflib import SequenceMatcher
from pathlib import Path
import joblib
import pandas as pd
import pandera.pandas as pa
from sklearn.pipeline import Pipeline
from pydantic import BaseModel, Field
from sqlalchemy import select, func, text
from sqlalchemy.orm import Session
from .core import settings
from .integrations.openrouter_client import OpenRouterClient
from .db import DatasetMapping, DatasetVersion, ModelVersion, ModelDeployment, now
from .ml.genres import MultiHotGenreEncoder, canonical_genre, parse_genres

LOG = logging.getLogger(__name__)
FIELDS = {"budget": "float", "genre": "string", "planned_duration": "float", "release_date": "date", "marketing_budget": "float", "revenue": "float", "audience": "float"}
ALIASES = {"budget": ["production_cost", "movie_budget", "film_cost", "budget_usd", "budgetusd"], "genre": ["category", "film_genre", "film_category"], "planned_duration": ["production_days", "shooting_days"], "release_date": ["releasedate"], "marketing_budget": ["marketing_spend"], "revenue": ["box_office", "box_office_income", "worldwide_gross", "total_gross", "global_boxoffice_usd", "global_box_office_usd", "global_boxofficeusd"], "audience": ["viewers", "ticket_sales"]}
OPERATIONS = {"none", "numeric", "date", "categorical", "exclude"}
FEATURES = ["budget", "genre", "planned_duration", "marketing_budget"]


class MovieInputError(ValueError):
    code = "invalid_movie_input"


class UnsupportedGenreError(MovieInputError):
    code = "unsupported_genre"


class ModelChangedError(RuntimeError):
    code = "active_model_changed"


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def trusted(path: str) -> Path:
    root = settings().storage_root.resolve()
    candidate = Path(path).resolve()
    if not candidate.is_relative_to(root):
        raise ValueError("Storage path outside trusted root")
    return candidate


def read_dataset(path: Path, sample: int | None = None) -> pd.DataFrame:
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path, nrows=sample, low_memory=False)
    if path.suffix.lower() == ".xlsx":
        return pd.read_excel(path, nrows=sample, engine="openpyxl")
    raise ValueError("Unsupported dataset format")


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def json_value(value):
    if pd.isna(value):
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "item"):
        return value.item()
    return value


def profile(path: Path, dataset_id: str) -> dict:
    df = read_dataset(path, settings().profile_rows)
    cols = []
    for name in df.columns:
        series = df[name]
        entry = {"name": str(name), "dtype": str(series.dtype), "null_count": int(series.isna().sum()), "null_percentage": float(series.isna().mean()), "sample_values": [json_value(v) for v in series.dropna().head(5)]}
        if pd.api.types.is_numeric_dtype(series):
            entry["statistics"] = {k: json_value(v) for k, v in series.describe().to_dict().items()}
        cols.append(entry)
    return {"dataset_id": dataset_id, "sampled_rows": len(df), "columns": cols, "duplicate_rows": int(df.duplicated().sum()), "sample_rows": [{k: json_value(v) for k, v in row.items()} for row in df.head(5).to_dict("records")], "parsing_problems": []}


class Suggestion(BaseModel):
    source_column: str
    target_column: str
    confidence: float = Field(ge=0, le=1)
    reason: str
    transformation: str
    requires_review: bool = True


class MappingResult(BaseModel):
    mappings: list[Suggestion]
    unmapped_columns: list[str]
    warnings: list[str]


def suggest(columns: list[dict]) -> dict:
    sources = [c["name"] for c in columns]
    used = set()
    matches = []
    ambiguous = []
    for source in sources:
        key = normalize(source)
        target = next((f for f in FIELDS if key == f), None)
        score = .99 if target else 0
        if not target:
            target = next((f for f, aliases in ALIASES.items() if key in aliases), None)
            score = .93 if target else 0
        if not target:
            ranked = sorted(((SequenceMatcher(None, key, alias).ratio(), f) for f in FIELDS for alias in [f, *ALIASES.get(f, [])]), reverse=True)
            if ranked and ranked[0][0] >= .82:
                score, target = ranked[0]
                score = min(score, .85)
        if target and target not in used:
            used.add(target)
            matches.append(Suggestion(source_column=source, target_column=target, confidence=score, reason="Deterministic name match", transformation="numeric" if FIELDS[target] == "float" else "date" if FIELDS[target] == "date" else "categorical", requires_review=score < .9).model_dump())
        else:
            ambiguous.append(source)
    warnings = []
    if ambiguous and settings().openrouter_api_key:
        try:
            result = ai_suggest([c for c in columns if c["name"] in ambiguous], used)
            for item in result.mappings:
                if item.source_column not in ambiguous or item.target_column not in FIELDS or item.target_column in used or item.transformation not in OPERATIONS:
                    warnings.append("Ignored invalid AI suggestion")
                    continue
                used.add(item.target_column)
                ambiguous.remove(item.source_column)
                matches.append(item.model_dump())
        except Exception as exc:
            LOG.warning("OpenRouter mapping unavailable: %s", type(exc).__name__)
            warnings.append("AI unavailable; manual mapping required for unmatched columns")
    return MappingResult(mappings=matches, unmapped_columns=ambiguous, warnings=warnings).model_dump()


def ai_suggest(columns: list[dict], used: set[str]) -> MappingResult:
    payload = {"columns": [{"name": c["name"], "dtype": c["dtype"]} for c in columns], "canonical_fields": {k: v for k, v in FIELDS.items() if k not in used}, "allowed_transformations": sorted(OPERATIONS)}
    return OpenRouterClient().json_completion(payload, MappingResult)


def validate_mapping(mapping: dict, source_columns: list[str]) -> None:
    seen_sources, seen_targets = set(), set()
    for item in mapping.get("mappings", []):
        source, target = item.get("source_column"), item.get("target_column")
        if source not in source_columns or source in seen_sources or target not in FIELDS or target in seen_targets or item.get("transformation", "none") not in OPERATIONS:
            raise ValueError("Invalid, duplicate, or conflicting mapping")
        seen_sources.add(source)
        seen_targets.add(target)


def standardize(path: Path, mapping: dict, output: Path) -> dict:
    df = read_dataset(path)
    validate_mapping(mapping, list(df.columns))
    rename = {m["source_column"]: m["target_column"] for m in mapping["mappings"] if m.get("transformation") != "exclude"}
    df = df[list(rename)].rename(columns=rename)
    required = {"revenue", "budget", "genre"}
    if not required.issubset(df.columns):
        raise ValueError(f"Missing required fields: {sorted(required - set(df.columns))}")
    for field in df.columns:
        if FIELDS[field] == "float":
            df[field] = pd.to_numeric(df[field], errors="coerce")
            if field in {"revenue", "budget", "planned_duration", "marketing_budget"} and (df[field].dropna() < 0).any():
                raise ValueError(f"Negative values in {field}")
        elif FIELDS[field] == "date":
            df[field] = pd.to_datetime(df[field], errors="coerce").dt.strftime("%Y-%m-%d")
        else:
            df[field] = df[field].astype("string").str.strip()
    schema_columns = {field: pa.Column(float, nullable=True, coerce=True) for field in ("revenue", "budget", "planned_duration", "marketing_budget") if field in df}
    schema_columns["genre"] = pa.Column(str, nullable=True, coerce=True)
    schema = pa.DataFrameSchema(schema_columns, strict=False)
    schema.validate(df, lazy=True)
    invalid = df[list(required)].isna().any(axis=1) | (df["genre"] == "") | df.duplicated()
    clean = df.loc[~invalid].copy()
    if len(clean) < 10:
        raise ValueError("At least 10 valid rows required after cleaning")
    output.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(output, index=False)
    return {"valid_rows": len(clean), "invalid_rows": int(invalid.sum()), "errors": [], "warnings": [f"{int(invalid.sum())} rows excluded by required-field/duplicate rule"] if invalid.any() else []}


def verify_model(model: ModelVersion) -> tuple[object, dict]:
    folder = trusted(model.artifact_path)
    manifest_path, model_path, metrics_path = [folder / p for p in ("manifest.json", "model.joblib", "metrics.json")]
    if not all(p.is_file() for p in (manifest_path, model_path, metrics_path)):
        raise ValueError("Artifact incomplete")
    if digest(model_path) != model.artifact_checksum:
        raise ValueError("Artifact checksum mismatch")
    manifest = json.loads(manifest_path.read_text())
    if manifest != model.manifest or manifest.get("model_type") != model.model_type or manifest.get("output_type") != "point_prediction" or not set(manifest.get("feature_columns", [])).issubset(FEATURES) or not {"budget", "genre"}.issubset(manifest.get("feature_columns", [])):
        raise ValueError("Inference contract mismatch")
    if manifest.get("currency") not in (None, "USD"):
        raise ValueError("Movie model currency contract must be USD")
    pipeline = joblib.load(model_path)
    vocabulary = genre_vocabulary(pipeline, manifest)
    if manifest.get("supports_multiple_genres"):
        encoder = pipeline.named_steps["preprocessor"].named_transformers_.get("genre")
        if not isinstance(encoder, MultiHotGenreEncoder) or not vocabulary or list(encoder.categories_) != vocabulary:
            raise ValueError("Multi-genre model vocabulary does not match its artifact")
    sample_genre = vocabulary[0] if vocabulary else "Drama"
    multi = supports_multiple_genres(pipeline, manifest)
    sample = pd.DataFrame([{
        k: {"budget": 1000000, "genre": [sample_genre] if multi else sample_genre,
            "planned_duration": 30, "marketing_budget": 100000}[k]
        for k in manifest["feature_columns"]
    }])
    value = float(pipeline.predict(sample)[0])
    if not pd.notna(value):
        raise ValueError("Smoke test returned invalid prediction")
    return pipeline, manifest


def genre_vocabulary(pipeline, manifest: dict) -> list[str]:
    declared = manifest.get("genre_vocabulary")
    if isinstance(declared, list) and all(isinstance(item, str) for item in declared):
        return declared
    try:
        encoder = pipeline.named_steps["preprocessor"].named_transformers_["genre"]
        if isinstance(encoder, MultiHotGenreEncoder):
            return [str(item) for item in encoder.categories_]
        if isinstance(encoder, Pipeline):
            for step in encoder.steps:
                categories = getattr(step[1], "categories_", None)
                if categories:
                    return [str(item) for item in categories[0] if isinstance(item, str) and item.strip()]
    except (AttributeError, KeyError, TypeError):
        pass
    return []


def supports_multiple_genres(pipeline, manifest: dict) -> bool:
    if isinstance(manifest.get("supports_multiple_genres"), bool):
        return manifest["supports_multiple_genres"]
    try:
        encoder = pipeline.named_steps["preprocessor"].named_transformers_["genre"]
        return isinstance(encoder, MultiHotGenreEncoder)
    except (AttributeError, KeyError, TypeError):
        return False


def _normalized_movie_features(pipeline, manifest: dict, values: dict) -> tuple[dict, list[str], str]:
    currency = values.get("currency") or manifest.get("currency") or "USD"
    model_currency = manifest.get("currency") or "USD"
    if model_currency != "USD":
        raise MovieInputError("The active movie model is not configured for USD.")
    if currency != model_currency:
        raise MovieInputError(f"This model accepts {model_currency} values only; no currency conversion is applied.")
    budget = values.get("budget")
    if not isinstance(budget, (int, float)) or not math.isfinite(float(budget)) or budget < 0:
        raise MovieInputError("A nonnegative budget in USD is required.")
    raw_genres = values.get("genres", values.get("genre"))
    try:
        selected = parse_genres(raw_genres)
    except ValueError as exc:
        raise MovieInputError(str(exc)) from exc
    vocabulary = genre_vocabulary(pipeline, manifest)
    canonical = []
    for genre in selected:
        match = canonical_genre(genre, vocabulary)
        if match is None:
            raise UnsupportedGenreError(f"Unsupported genre: {genre}. Choose from the active model's supported genre list.")
        canonical.append(match)
    if len(canonical) > 1 and not supports_multiple_genres(pipeline, manifest):
        raise MovieInputError("The active model accepts one genre. Train and promote a multi-genre compatible model first.")
    features = {}
    for field in manifest["feature_columns"]:
        if field == "genre":
            features[field] = canonical if supports_multiple_genres(pipeline, manifest) else canonical[0]
        elif field == "budget":
            features[field] = float(budget)
        elif field in {"planned_duration", "marketing_budget"}:
            value = values.get(field)
            if value is not None and (not isinstance(value, (int, float)) or not math.isfinite(float(value)) or value < 0):
                raise MovieInputError(f"{field} must be a nonnegative number.")
            features[field] = float(value) if value is not None else float("nan")
        else:
            value = values.get(field)
            if value is None:
                raise MovieInputError(f"The active model requires {field}.")
            features[field] = value
    return features, canonical, model_currency


def predict_movie_revenue(db: Session, values: dict, expected_model_version: str | None = None) -> dict:
    model = active_model(db)
    if not model:
        raise RuntimeError("No active movie revenue model")
    if expected_model_version and model.id != expected_model_version:
        raise ModelChangedError("The active model changed during the scenario. Please retry.")
    pipeline, manifest = verify_model(model)
    features, genres, currency = _normalized_movie_features(pipeline, manifest, values)
    value = float(pipeline.predict(pd.DataFrame([features]))[0])
    if not math.isfinite(value):
        raise RuntimeError("Inference returned a non-finite revenue value")
    return {
        "domain": "movie",
        "model_version": model.id,
        "model_type": model.model_type,
        "prediction_type": "point",
        "currency": currency,
        "inputs": {"budget": float(values["budget"]), "genres": genres, "currency": currency,
                   "planned_duration": values.get("planned_duration"), "marketing_budget": values.get("marketing_budget")},
        "prediction": {"revenue": value},
        "assumptions": [],
        "warnings": ["This model returns a point prediction, not an uncertainty interval."],
    }


def active_movie_model_metadata(db: Session) -> dict:
    model = active_model(db)
    if not model:
        raise RuntimeError("No active movie revenue model")
    pipeline, manifest = verify_model(model)
    vocabulary = genre_vocabulary(pipeline, manifest)
    supports_multiple = supports_multiple_genres(pipeline, manifest)
    currency = manifest.get("currency") or "USD"
    feature_columns = manifest["feature_columns"]
    features = {
        "budget": {"type": "number", "required": True, "minimum": 0, "currency": currency},
        "genres": {"type": "multi_categorical" if supports_multiple else "categorical", "required": True,
                   "multiple": supports_multiple, "options": vocabulary},
    }
    for field in ("planned_duration", "marketing_budget"):
        if field in feature_columns:
            features[field] = {"type": "number", "required": False, "minimum": 0}
    return {
        "model_version": model.id,
        "domain": "movie",
        "model_type": model.model_type,
        "currency": currency,
        "prediction_targets": [manifest.get("target", "revenue")],
        "prediction_type": manifest.get("output_type", "point_prediction").replace("_prediction", ""),
        "features": features,
        "evaluation_metrics": model.metrics,
        "limitations": ["Revenue is a model estimate.", "The active model does not produce audience forecasts or uncertainty ranges."],
    }


def active_model(db: Session, family: str = "lgbm_revenue") -> ModelVersion | None:
    return db.scalar(select(ModelVersion).where(ModelVersion.model_type == family, ModelVersion.status == "active"))


def deploy(db: Session, model: ModelVersion, action: str, approved_by: str):
    db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:family))"), {"family": model.model_type})
    pipeline, _ = verify_model(model)
    del pipeline
    current = active_model(db, model.model_type)
    if current and current.id != model.id:
        current.status = "archived"
        db.flush()
    model.status = "active"
    db.add(ModelDeployment(model_type=model.model_type, model_version_id=model.id, action=action, approved_by=approved_by))
    db.commit()
