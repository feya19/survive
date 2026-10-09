import pandas as pd
import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.analytics.movie_analytics import AnalyticsError, dataset_statistics, query_movie_analytics
from app.analytics.schemas import MovieAnalyticsQuery
from app.core import Settings
from app.db import Base, Dataset, DatasetMapping, DatasetVersion, TrainingJob, ValidationRun
from app.pipeline import digest


@pytest.fixture
def approved_movies(tmp_path, monkeypatch):
    storage = tmp_path / "storage"
    storage.mkdir()
    dataset_dir = storage / "datasets" / "dataset-1"
    dataset_dir.mkdir(parents=True)
    source = dataset_dir / "standardized.csv"
    pd.DataFrame({
        "budget": [100, 150, 1_200_000, 1_300_000],
        "genre": ["Action, Comedy", "Action/Comedy", "Comedy", "Drama"],
        "revenue": [300, 500, 3_000, 5_000],
    }).to_csv(source, index=False)
    monkeypatch.setattr("app.pipeline.settings", lambda: Settings(storage_root=storage))

    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(engine, expire_on_commit=False)
    with session_factory() as db:
        dataset = Dataset(id="dataset-1", filename="movies.csv", status="uploaded")
        db.add(dataset)
        db.flush()
        version = DatasetVersion(
            id="version-1", dataset_id=dataset.id, version=1, kind="standardized",
            path=str(source), sha256=digest(source), row_count=4, column_count=3, mapping_revision=1,
        )
        db.add_all([
            DatasetMapping(dataset_id=dataset.id, revision=1, data={"mappings": []}, approved=True),
            version,
        ])
        db.flush()
        db.add_all([
            ValidationRun(dataset_id=dataset.id, mapping_revision=1, standardized_version_id=version.id, status="passed", report={}),
            TrainingJob(dataset_version_id=version.id, model_type="lgbm_revenue", target="revenue", parameters={"currency": "USD"}, status="completed"),
        ])
        db.commit()
        yield db, source
    engine.dispose()


def test_dataset_statistics_use_only_approved_version_and_verified_usd(approved_movies):
    db, _source = approved_movies
    result = dataset_statistics(db, "dataset-1")
    assert result["dataset_version_id"] == "version-1"
    assert result["currency"] == "USD"
    assert result["record_count"] == 4
    assert result["average_revenue"] == 2200
    assert result["median_budget"] == 600_075
    groups = {row["genre"]: row for row in result["revenue_by_genre"]}
    assert groups["Action"]["movie_count"] == 2
    assert groups["Action"]["average_revenue"] == 400
    assert groups["Comedy"]["movie_count"] == 3
    assert "once to each distinct genre" in result["genre_aggregation"]


def test_predefined_analytics_operations_return_reproducible_rows(approved_movies):
    db, _source = approved_movies
    genres = query_movie_analytics(db, "dataset-1", "movie_count_by_genre")
    assert {row["genre"]: row["movie_count"] for row in genres["rows"]} == {"Action": 2, "Comedy": 3, "Drama": 1}

    buckets = query_movie_analytics(db, "dataset-1", "revenue_by_budget_bucket", budget_bucket_size=1_000_000)
    assert buckets["rows"][0] == {"budget_min": 0, "budget_max": 1_000_000, "movie_count": 2, "average_revenue": 400}

    scatter = query_movie_analytics(db, "dataset-1", "budget_revenue_scatter", genre="Action", max_points=1)
    assert scatter["row_count"] == 2
    assert scatter["sampled_points"] == 1
    assert scatter["dataset_version_id"] == "version-1"


def test_analytics_refuses_unapproved_or_changed_dataset(approved_movies):
    db, source = approved_movies
    mapping = db.query(DatasetMapping).filter_by(dataset_id="dataset-1").one()
    mapping.approved = False
    db.commit()
    with pytest.raises(AnalyticsError, match="approved"):
        dataset_statistics(db, "dataset-1")

    mapping.approved = True
    db.commit()
    source.write_text(source.read_text() + "100,Drama,1000\n")
    with pytest.raises(AnalyticsError, match="checksum"):
        query_movie_analytics(db, "dataset-1", "budget_revenue_scatter")


def test_analytics_request_rejects_arbitrary_operations_and_sql():
    with pytest.raises(ValidationError):
        MovieAnalyticsQuery(dataset_id="dataset-1", operation="SELECT * FROM movies")
    with pytest.raises(ValidationError):
        MovieAnalyticsQuery(dataset_id="dataset-1", operation="average_revenue_by_genre", query="DROP TABLE datasets")
