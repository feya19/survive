import json
import logging
from pathlib import Path
from celery import Celery
from sqlalchemy import select
from .core import settings
from .db import SessionLocal, TrainingJob, DatasetVersion, ModelVersion, now
from .pipeline import digest, trusted, FEATURES, verify_model
from .ml.adapters.lgbm_notebook import LightGBMNotebookTrainingAdapter

LOG = logging.getLogger(__name__)
celery_app = Celery("survive", broker=settings().redis_url, backend=settings().redis_url)
celery_app.conf.task_track_started = True


@celery_app.task(name="app.worker.train_job")
def train_job(job_id: str):
    with SessionLocal() as db:
        job = db.get(TrainingJob, job_id)
        if not job or job.status != "queued":
            return
        job.status, job.started_at = "running", now()
        db.commit()
        try:
            version = db.get(DatasetVersion, job.dataset_version_id)
            source = trusted(version.path)
            if digest(source) != version.sha256:
                raise ValueError("Dataset checksum mismatch")
            output = settings().storage_root / "models" / job.id
            output.mkdir(parents=True, exist_ok=False)
            adapter = LightGBMNotebookTrainingAdapter()
            adapter.validate_dataset(source, job.parameters)
            adapter.train(source, {**job.parameters, "dataset_version_id": version.id}, output)
            manifest = adapter.export_artifacts(output)
            metrics = adapter.evaluate(output)
            if manifest.get("training_dataset_version") != version.id or manifest.get("model_type") != job.model_type or not set(manifest.get("feature_columns", [])).issubset(FEATURES):
                raise ValueError("Manifest mismatch")
            if not all(isinstance(metrics.get(k), (int, float)) for k in ("mae", "rmse")):
                raise ValueError("Invalid metrics")
            model_path = output / "model.joblib"
            model = ModelVersion(model_type=job.model_type, dataset_version_id=version.id, mapping_revision=version.mapping_revision, training_job_id=job.id, artifact_path=str(output), artifact_checksum=digest(model_path), metrics=metrics, manifest=manifest, training_config=job.parameters)
            verify_model(model)
            db.add(model)
            db.flush()
            job.status, job.model_version_id, job.metrics, job.finished_at = "completed", model.id, metrics, now()
            db.commit()
        except Exception as exc:
            LOG.exception("Training job %s failed", job_id)
            db.rollback()
            job = db.get(TrainingJob, job_id)
            job.status, job.error, job.finished_at = "failed", str(exc)[:2000], now()
            db.commit()
            raise
