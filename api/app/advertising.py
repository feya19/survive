"""Verified inference and historical views for the bundled advertising model."""

import hashlib
import math
import uuid
from datetime import date
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import Literal

from .db import Dataset, DatasetVersion
from .pipeline import active_model, read_dataset, trusted, verify_model


ARTIFACT = Path(__file__).resolve().parent / "ml" / "assets" / "advertising_revenue.joblib"


class AdvertisingInputError(ValueError):
    code = "invalid_advertising_input"


class AdvertisingPredictionArguments(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ad_spend: float = Field(ge=0, allow_inf_nan=False)
    campaign_date: date
    platform: str = Field(min_length=1, max_length=80)
    campaign_type: str = Field(min_length=1, max_length=80)
    industry: str = Field(min_length=1, max_length=80)
    country: str = Field(min_length=1, max_length=80)
    currency: Literal["USD"] = "USD"

    @field_validator("platform", "campaign_type", "industry", "country")
    @classmethod
    def trim_label(cls, value: str) -> str:
        return value.strip()


class AdvertisingSpendScenarioArguments(AdvertisingPredictionArguments):
    spend_change_percent: float = Field(ge=-100, le=1000, allow_inf_nan=False)


def _feature_frame(values: dict) -> pd.DataFrame:
    campaign_date = pd.to_datetime(values["campaign_date"])
    month = campaign_date.month
    weekday = campaign_date.dayofweek
    spend = float(values["ad_spend"])
    return pd.DataFrame([{
        "ad_spend": spend,
        "log_ad_spend": np.log1p(spend),
        "year": campaign_date.year,
        "month": month,
        "day_of_week": weekday,
        "day_of_month": campaign_date.day,
        "quarter": campaign_date.quarter,
        "month_sin": np.sin(2 * np.pi * month / 12),
        "month_cos": np.cos(2 * np.pi * month / 12),
        "weekday_sin": np.sin(2 * np.pi * weekday / 7),
        "weekday_cos": np.cos(2 * np.pi * weekday / 7),
        "platform": values["platform"],
        "campaign_type": values["campaign_type"],
        "industry": values["industry"],
        "country": values["country"],
    }])


@lru_cache(maxsize=1)
def advertising_bundle() -> dict:
    if not ARTIFACT.is_file():
        raise RuntimeError("Advertising model artifact is unavailable")
    bundle = joblib.load(ARTIFACT)
    expected = {"preprocessor", "estimator", "categories", "metrics", "analytics"}
    if bundle.get("model_type") != "lgbm_advertising_revenue" or not expected.issubset(bundle):
        raise RuntimeError("Advertising model artifact contract is invalid")
    return bundle


def _canonical(value: str, options: list[str], field: str) -> str:
    lookup = {option.casefold(): option for option in options}
    result = lookup.get(value.strip().casefold())
    if result is None:
        raise AdvertisingInputError(f"Unsupported {field}: {value}. Choose a value reported by the active advertising model.")
    return result


def advertising_model_version(bundle: dict | None = None) -> str:
    bundle = bundle or advertising_bundle()
    digest = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()[:12]
    return f"advertising-revenue-v1-{digest}"


def _deployed_model(db: Session | None):
    if db is None:
        return None
    model = active_model(db, "lgbm_advertising_revenue")
    if model is None:
        return None
    pipeline, manifest = verify_model(model)
    return model, pipeline, manifest


def advertising_metadata(db: Session | None = None) -> dict:
    deployed = _deployed_model(db)
    if deployed:
        model, _, manifest = deployed
        version = db.get(DatasetVersion, model.dataset_version_id)
        categories = manifest.get("categories") or {}
        return {
            "model_version": model.id,
            "domain": "advertising",
            "model_type": model.model_type,
            "currency": manifest.get("currency", "USD"),
            "prediction_targets": [manifest.get("target", "revenue")],
            "prediction_type": "point",
            "features": {
                "ad_spend": {"type": "number", "required": True, "minimum": 0, "currency": "USD"},
                "campaign_date": {"type": "date", "required": True},
                **{field: {"type": "categorical", "required": True, "options": options} for field, options in categories.items()},
            },
            "evaluation_metrics": model.metrics,
            "training_rows": manifest.get("training_rows", 0),
            "holdout_rows": model.metrics.get("holdout_rows", 0),
            "dataset_rows": version.row_count if version else 0,
            "dataset_version_id": model.dataset_version_id,
            "dataset_status": "approved",
            "training_period": {"start": manifest.get("training_date_min"), "end": manifest.get("training_date_max")},
            "limitations": [
                "Revenue is a point estimate from historical advertising performance.",
                "Spend comparisons are model-based what-if estimates, not causal effects.",
                "Clicks, conversions, CTR, CPC, CPA, and ROAS are excluded to avoid outcome leakage.",
            ],
        }
    bundle = advertising_bundle()
    return {
        "model_version": advertising_model_version(bundle),
        "domain": "advertising",
        "model_type": bundle["model_type"],
        "currency": bundle["currency"],
        "prediction_targets": [bundle["target"]],
        "prediction_type": bundle["prediction_type"],
        "features": {
            "ad_spend": {"type": "number", "required": True, "minimum": 0, "currency": "USD"},
            "campaign_date": {"type": "date", "required": True},
            **{
                field: {"type": "categorical", "required": True, "options": options}
                for field, options in bundle["categories"].items()
            },
        },
        "evaluation_metrics": bundle["metrics"],
        "training_rows": bundle["training_rows"],
        "holdout_rows": bundle["metrics"].get("holdout_rows", 0),
        "dataset_rows": bundle["analytics"]["record_count"],
        "dataset_version_id": bundle["source_sha256"][:16],
        "dataset_status": "approved",
        "training_period": {"start": bundle["training_date_min"], "end": bundle["training_date_max"]},
        "limitations": [
            *bundle["limitations"],
            f"Training data covers {bundle['training_date_min']} through {bundle['training_date_max']}; later campaign dates are temporal extrapolations.",
        ],
    }


def predict_advertising_revenue(values: dict, db: Session | None = None) -> dict:
    deployed = _deployed_model(db)
    bundle = None if deployed else advertising_bundle()
    normalized = dict(values)
    categories = deployed[2].get("categories", {}) if deployed else bundle["categories"]
    for field, options in categories.items():
        normalized[field] = _canonical(str(values[field]), options, field)
    if deployed:
        model, pipeline, _ = deployed
        frame = pd.DataFrame([{
            "ad_spend": float(normalized["ad_spend"]),
            "date": str(normalized["campaign_date"]),
            **{field: normalized[field] for field in categories},
        }])
        revenue = float(max(pipeline.predict(frame)[0], 0))
        model_version = model.id
        model_type = model.model_type
    else:
        transformed = bundle["preprocessor"].transform(_feature_frame(normalized))
        revenue = float(max(np.expm1(bundle["estimator"].predict(transformed)[0]), 0))
        model_version = advertising_model_version(bundle)
        model_type = bundle["model_type"]
    if not math.isfinite(revenue):
        raise RuntimeError("Advertising inference returned a non-finite revenue value")
    normalized["ad_spend"] = float(values["ad_spend"])
    normalized["campaign_date"] = str(values["campaign_date"])
    normalized["currency"] = "USD"
    return {
        "result_id": str(uuid.uuid4()),
        "domain": "advertising",
        "model_version": model_version,
        "model_type": model_type,
        "prediction_type": "point",
        "currency": "USD",
        "inputs": normalized,
        "prediction": {"revenue": revenue},
        "assumptions": ["Ad spend and campaign configuration are known at planning time."],
        "warnings": ["This is a point estimate, not an uncertainty interval or causal return estimate."],
        "dashboard_data": {
            "fields": ["ad_spend", "revenue", "platform", "campaign_type", "model_version", "currency"],
            "rows": [{
                "ad_spend": normalized["ad_spend"], "revenue": revenue,
                "platform": normalized["platform"], "campaign_type": normalized["campaign_type"],
                "model_version": model_version, "currency": "USD",
            }],
        },
    }


def simulate_advertising_spend(values: dict, db: Session | None = None) -> dict:
    baseline_values = {key: value for key, value in values.items() if key != "spend_change_percent"}
    baseline = predict_advertising_revenue(baseline_values, db)
    modified_spend = float(values["ad_spend"]) * (1 + float(values["spend_change_percent"]) / 100)
    modified = predict_advertising_revenue({**baseline_values, "ad_spend": modified_spend}, db)
    return {
        "result_id": str(uuid.uuid4()),
        "domain": "advertising",
        "scenario_type": "model_based_spend_what_if",
        "causal_estimate": False,
        "spend_change_percent": float(values["spend_change_percent"]),
        "baseline": baseline,
        "modified": modified,
        "revenue_change": modified["prediction"]["revenue"] - baseline["prediction"]["revenue"],
        "model_version": baseline["model_version"],
        "assumptions": ["All campaign inputs except ad spend are held constant."],
        "warnings": ["This model-based comparison is not a causal estimate of changing ad spend."],
        "dashboard_data": {
            "fields": ["scenario", "ad_spend", "revenue", "model_version", "currency"],
            "rows": [
                {"scenario": "baseline", "ad_spend": baseline["inputs"]["ad_spend"], "revenue": baseline["prediction"]["revenue"], "model_version": baseline["model_version"], "currency": "USD"},
                {"scenario": "modified", "ad_spend": modified["inputs"]["ad_spend"], "revenue": modified["prediction"]["revenue"], "model_version": modified["model_version"], "currency": "USD"},
            ],
        },
    }


def _analytics_result(operation: str, analytics: dict, dataset_version_id: str) -> dict:
    operations = {
        "average_revenue_by_platform": ("revenue_by_platform", ["platform", "campaign_count", "average_revenue"]),
        "average_revenue_by_campaign_type": ("revenue_by_campaign_type", ["campaign_type", "campaign_count", "average_revenue"]),
        "average_revenue_by_industry": ("revenue_by_industry", ["industry", "campaign_count", "average_revenue"]),
        "spend_revenue_scatter": ("spend_revenue_scatter", ["ad_spend", "revenue", "platform"]),
    }
    if operation not in operations:
        raise AdvertisingInputError("Unsupported advertising analytics operation")
    source, fields = operations[operation]
    rows = analytics[source]
    result_id = str(uuid.uuid4())
    return {
        "result_id": result_id,
        "domain": "advertising",
        "operation": operation,
        "dataset_version_id": dataset_version_id,
        "currency": "USD",
        "row_count": analytics["record_count"],
        "fields": fields,
        "rows": rows,
        "dashboard_data": {"fields": fields, "rows": rows},
    }


def advertising_analytics(operation: str) -> dict:
    bundle = advertising_bundle()
    return _analytics_result(operation, bundle["analytics"], bundle["source_sha256"][:16])


def advertising_dataset_analytics(db: Session, dataset_id: str, operation: str) -> dict:
    dataset = db.get(Dataset, dataset_id)
    if dataset is None or dataset.domain != "advertising":
        raise AdvertisingInputError("Approved advertising dataset not found")
    version = db.scalar(select(DatasetVersion).where(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.kind == "standardized",
    ).order_by(DatasetVersion.version.desc()))
    if version is None:
        raise AdvertisingInputError("The advertising dataset must be approved and validated first")
    frame = read_dataset(trusted(version.path))
    required = {"ad_spend", "revenue", "platform", "campaign_type", "industry"}
    if not required.issubset(frame.columns):
        raise AdvertisingInputError("The validated advertising dataset does not support dashboard analytics")
    frame["ad_spend"] = pd.to_numeric(frame["ad_spend"], errors="coerce")
    frame["revenue"] = pd.to_numeric(frame["revenue"], errors="coerce")
    frame = frame.dropna(subset=list(required)).copy()

    def grouped(field: str) -> list[dict]:
        values = frame.groupby(field, dropna=False)["revenue"].agg(["count", "mean"]).reset_index()
        return [{field: str(row[field]), "campaign_count": int(row["count"]), "average_revenue": float(row["mean"])} for _, row in values.sort_values(field).iterrows()]

    sample = frame.iloc[np.linspace(0, len(frame) - 1, min(160, len(frame)), dtype=int)] if len(frame) else frame
    analytics = {
        "record_count": int(len(frame)),
        "revenue_by_platform": grouped("platform"),
        "revenue_by_campaign_type": grouped("campaign_type"),
        "revenue_by_industry": grouped("industry"),
        "spend_revenue_scatter": [{"ad_spend": float(row.ad_spend), "revenue": float(row.revenue), "platform": str(row.platform)} for row in sample.itertuples()],
    }
    return _analytics_result(operation, analytics, version.id)
