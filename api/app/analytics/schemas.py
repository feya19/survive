from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


MovieAnalyticsOperation = Literal[
    "average_revenue_by_genre",
    "revenue_by_budget_bucket",
    "movie_count_by_genre",
    "budget_revenue_scatter",
]


class StrictAnalyticsModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MovieAnalyticsQuery(StrictAnalyticsModel):
    dataset_id: str = Field(min_length=1, max_length=36)
    operation: MovieAnalyticsOperation
    genre: str | None = Field(default=None, min_length=1, max_length=80)
    budget_bucket_size: Decimal = Field(default=Decimal("1000000"), gt=0, allow_inf_nan=False)
    max_points: int = Field(default=500, ge=1, le=500)


class GenreStatistic(StrictAnalyticsModel):
    genre: str
    movie_count: int = Field(ge=0)
    average_revenue: float


class MovieStatisticsResult(StrictAnalyticsModel):
    result_id: UUID
    domain: Literal["movie"]
    dataset_id: str
    dataset_version_id: str
    currency: Literal["USD"] | None
    record_count: int = Field(ge=0)
    average_revenue: float | None
    median_revenue: float | None
    median_budget: float | None
    revenue_by_genre: list[GenreStatistic]
    genre_aggregation: str
    warnings: list[str]


class MovieAnalyticsResult(StrictAnalyticsModel):
    result_id: UUID
    domain: Literal["movie"]
    operation: MovieAnalyticsOperation
    dataset_id: str
    dataset_version_id: str
    currency: Literal["USD"] | None
    row_count: int = Field(ge=0)
    fields: list[str]
    rows: list[dict[str, Any]]
    aggregation_policy: str | None = None
    budget_bucket_size: float | None = None
    sampled_points: int | None = None
    sample_method: str | None = None
