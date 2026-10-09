import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine, String, Integer, DateTime, ForeignKey, JSON, Float, Boolean, UniqueConstraint, Index, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .core import settings


def now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


def uid():
    return str(uuid.uuid4())


class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    filename: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="uploaded")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    kind: Mapped[str] = mapped_column(String(32))
    path: Mapped[str] = mapped_column(String(500))
    sha256: Mapped[str] = mapped_column(String(64))
    row_count: Mapped[int] = mapped_column(Integer)
    column_count: Mapped[int] = mapped_column(Integer)
    mapping_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("dataset_id", "version", "kind"),)


class DatasetProfile(Base):
    __tablename__ = "dataset_profiles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    dataset_version_id: Mapped[str] = mapped_column(ForeignKey("dataset_versions.id"), unique=True)
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DatasetMapping(Base):
    __tablename__ = "dataset_mappings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    data: Mapped[dict] = mapped_column(JSON)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("dataset_id", "revision"),)


class ValidationRun(Base):
    __tablename__ = "dataset_validation_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), index=True)
    mapping_revision: Mapped[int] = mapped_column(Integer)
    standardized_version_id: Mapped[str | None] = mapped_column(ForeignKey("dataset_versions.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(32))
    report: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class TrainingJob(Base):
    __tablename__ = "training_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    dataset_version_id: Mapped[str] = mapped_column(ForeignKey("dataset_versions.id"))
    model_type: Mapped[str] = mapped_column(String(64))
    target: Mapped[str] = mapped_column(String(64))
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    idempotency_key: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="queued")
    model_version_id: Mapped[str | None] = mapped_column(ForeignKey("model_versions.id"), nullable=True)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ModelVersion(Base):
    __tablename__ = "model_versions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    model_type: Mapped[str] = mapped_column(String(64), index=True)
    dataset_version_id: Mapped[str] = mapped_column(ForeignKey("dataset_versions.id"))
    mapping_revision: Mapped[int] = mapped_column(Integer)
    training_job_id: Mapped[str] = mapped_column(ForeignKey("training_jobs.id"), unique=True)
    artifact_path: Mapped[str] = mapped_column(String(500))
    artifact_checksum: Mapped[str] = mapped_column(String(64))
    metrics: Mapped[dict] = mapped_column(JSON)
    manifest: Mapped[dict] = mapped_column(JSON)
    training_config: Mapped[dict] = mapped_column(JSON)
    pipeline_version: Mapped[str] = mapped_column(String(32), default="1")
    status: Mapped[str] = mapped_column(String(32), default="candidate")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (Index("uq_active_model_family", "model_type", unique=True, postgresql_where=text("status = 'active'")),)


class ModelDeployment(Base):
    __tablename__ = "model_deployments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    model_type: Mapped[str] = mapped_column(String(64), index=True)
    model_version_id: Mapped[str] = mapped_column(ForeignKey("model_versions.id"))
    action: Mapped[str] = mapped_column(String(32))
    approved_by: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


engine = create_engine(settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)
