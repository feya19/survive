"""Approved-dataset analytics with fixed operations and verified provenance."""

import math
import uuid
from collections import defaultdict
from decimal import Decimal

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import Dataset, DatasetMapping, DatasetVersion, TrainingJob, ValidationRun
from app.analytics.schemas import MovieAnalyticsResult, MovieStatisticsResult
from app.ml.genres import parse_genres
from app.pipeline import digest, read_dataset, trusted


class AnalyticsError(ValueError):
    def __init__(self, code: str, message: str, status_code: int = 409):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


def approved_dataset(db: Session, dataset_id: str) -> tuple[DatasetVersion, pd.DataFrame, str | None]:
    dataset = db.get(Dataset, dataset_id)
    if dataset is None:
        raise AnalyticsError("dataset_not_found", "Dataset not found.", 404)

    mapping = db.scalar(
        select(DatasetMapping)
        .where(DatasetMapping.dataset_id == dataset_id)
        .order_by(DatasetMapping.revision.desc())
    )
    if mapping is None or not mapping.approved:
        raise AnalyticsError("dataset_not_approved", "An approved dataset mapping is required before analytics.")

    version = db.scalar(
        select(DatasetVersion)
        .where(
            DatasetVersion.dataset_id == dataset_id,
            DatasetVersion.kind == "standardized",
            DatasetVersion.mapping_revision == mapping.revision,
        )
        .order_by(DatasetVersion.version.desc())
    )
    if version is None:
        raise AnalyticsError("dataset_not_validated", "A validated standardized dataset is required before analytics.")

    validation = db.scalar(
        select(ValidationRun).where(
            ValidationRun.dataset_id == dataset_id,
            ValidationRun.mapping_revision == mapping.revision,
            ValidationRun.standardized_version_id == version.id,
            ValidationRun.status == "passed",
        )
    )
    if validation is None:
        raise AnalyticsError("dataset_not_validated", "A passing validation run is required before analytics.")

    try:
        path = trusted(version.path)
        checksum = digest(path)
    except (OSError, ValueError) as exc:
        raise AnalyticsError("dataset_integrity_error", "The approved dataset file is unavailable or outside managed storage.") from exc
    if checksum != version.sha256:
        raise AnalyticsError("dataset_integrity_error", "The approved dataset checksum did not match its stored version.")
    try:
        frame = read_dataset(path)
    except Exception as exc:
        raise AnalyticsError("dataset_unreadable", "The approved dataset could not be read.") from exc

    required = {"budget", "genre", "revenue"}
    if not required.issubset(frame.columns):
        raise AnalyticsError("dataset_contract_error", "The approved dataset does not contain budget, genre, and revenue.")

    currency = db.scalar(
        select(TrainingJob)
        .where(TrainingJob.dataset_version_id == version.id, TrainingJob.status == "completed")
        .order_by(TrainingJob.created_at.desc())
    )
    currency = currency.parameters.get("currency") if currency and currency.parameters else None
    if currency not in {"USD"}:
        currency = None
    return version, frame, currency


def _valid_movies(frame: pd.DataFrame) -> list[dict]:
    numeric = frame.copy()
    numeric["budget"] = pd.to_numeric(numeric["budget"], errors="coerce")
    numeric["revenue"] = pd.to_numeric(numeric["revenue"], errors="coerce")
    records = []
    for row in numeric[["budget", "genre", "revenue"]].to_dict("records"):
        try:
            budget, revenue = float(row["budget"]), float(row["revenue"])
            genres = parse_genres(row["genre"])
        except (TypeError, ValueError):
            continue
        if not math.isfinite(budget) or not math.isfinite(revenue) or budget < 0 or revenue < 0:
            continue
        records.append({"budget": budget, "revenue": revenue, "genres": genres})
    return records


def _genre_groups(movies: list[dict], selected_genre: str | None = None) -> list[dict]:
    groups: dict[str, list[float]] = defaultdict(list)
    labels: dict[str, str] = {}
    for movie in movies:
        # A multi-genre movie contributes once to each distinct genre, never to the same genre twice.
        for genre in movie["genres"]:
            key = genre.casefold()
            labels.setdefault(key, genre)
            if selected_genre is None or key == selected_genre.casefold():
                groups[key].append(movie["revenue"])
    return [
        {
            "genre": labels[key],
            "movie_count": len(values),
            "average_revenue": float(sum(values) / len(values)),
        }
        for key, values in sorted(groups.items(), key=lambda item: labels[item[0]].casefold())
        if values
    ]


def _result(version: DatasetVersion, currency: str | None, operation: str, fields: list[str], rows: list[dict], count: int, **extra) -> dict:
    result = {
        "result_id": str(uuid.uuid4()),
        "domain": "movie",
        "operation": operation,
        "dataset_id": version.dataset_id,
        "dataset_version_id": version.id,
        "currency": currency,
        "row_count": count,
        "fields": fields,
        "rows": rows,
        **extra,
    }
    return MovieAnalyticsResult.model_validate(result).model_dump(mode="json")


def dataset_statistics(db: Session, dataset_id: str) -> dict:
    version, frame, currency = approved_dataset(db, dataset_id)
    movies = _valid_movies(frame)
    revenues = [movie["revenue"] for movie in movies]
    budgets = [movie["budget"] for movie in movies]
    result = {
        "result_id": str(uuid.uuid4()),
        "domain": "movie",
        "dataset_id": dataset_id,
        "dataset_version_id": version.id,
        "currency": currency,
        "record_count": len(movies),
        "average_revenue": float(sum(revenues) / len(revenues)) if revenues else None,
        "median_revenue": float(pd.Series(revenues).median()) if revenues else None,
        "median_budget": float(pd.Series(budgets).median()) if budgets else None,
        "revenue_by_genre": _genre_groups(movies),
        "genre_aggregation": "Each movie contributes once to each distinct genre listed in its genre cell.",
        "warnings": [] if currency else ["The dataset's currency is not declared as USD; financial values are shown without a currency label."],
    }
    return MovieStatisticsResult.model_validate(result).model_dump(mode="json")


def query_movie_analytics(
    db: Session,
    dataset_id: str,
    operation: str,
    genre: str | None = None,
    budget_bucket_size: Decimal = Decimal("1000000"),
    max_points: int = 500,
) -> dict:
    version, frame, currency = approved_dataset(db, dataset_id)
    movies = _valid_movies(frame)
    if genre:
        genre_key = genre.strip().casefold()
        movies = [movie for movie in movies if any(item.casefold() == genre_key for item in movie["genres"])]

    if operation == "average_revenue_by_genre":
        rows = _genre_groups(movies, genre)
        return _result(version, currency, operation, ["genre", "movie_count", "average_revenue"], rows, len(movies), aggregation_policy="Each movie contributes once to each distinct genre in its genre cell.")

    if operation == "movie_count_by_genre":
        rows = [{"genre": row["genre"], "movie_count": row["movie_count"]} for row in _genre_groups(movies, genre)]
        return _result(version, currency, operation, ["genre", "movie_count"], rows, len(movies), aggregation_policy="Each movie contributes once to each distinct genre in its genre cell.")

    if operation == "revenue_by_budget_bucket":
        width = float(budget_bucket_size)
        if not math.isfinite(width) or width <= 0:
            raise AnalyticsError("invalid_bucket_size", "Budget bucket size must be a positive finite number.", 422)
        buckets: dict[int, list[float]] = defaultdict(list)
        for movie in movies:
            buckets[math.floor(movie["budget"] / width)].append(movie["revenue"])
        rows = [
            {
                "budget_min": index * width,
                "budget_max": (index + 1) * width,
                "movie_count": len(values),
                "average_revenue": float(sum(values) / len(values)),
            }
            for index, values in sorted(buckets.items())
        ]
        return _result(version, currency, operation, ["budget_min", "budget_max", "movie_count", "average_revenue"], rows, len(movies), budget_bucket_size=width)

    if operation == "budget_revenue_scatter":
        step = max(1, math.ceil(len(movies) / max_points))
        sampled = movies[::step][:max_points]
        rows = [{"budget": movie["budget"], "revenue": movie["revenue"], "genres": movie["genres"]} for movie in sampled]
        return _result(version, currency, operation, ["budget", "revenue", "genres"], rows, len(movies), sampled_points=len(rows), sample_method="Deterministic stride sample in source row order.")

    raise AnalyticsError("unsupported_operation", "The requested analytical operation is not supported.", 422)
