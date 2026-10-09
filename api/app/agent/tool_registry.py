from dataclasses import dataclass
from typing import Callable

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agent.schemas import (
    BudgetShockArguments,
    GetActiveMovieModelArguments,
    MovieAnalyticsArguments,
    MovieDatasetStatisticsArguments,
    MoviePredictionArguments,
)
from app.agent.tools.movie_analytics import get_movie_dataset_statistics_tool, query_movie_analytics_tool
from app.agent.tools.model_information import get_active_movie_model_tool
from app.agent.tools.movie_prediction import predict_movie_revenue_tool
from app.agent.tools.movie_scenario import simulate_budget_shock_tool


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    arguments_model: type[BaseModel]
    handler: Callable[[Session, BaseModel], dict]

TOOL_REGISTRY = {
    "predict_movie_revenue": ToolDefinition(
        "predict_movie_revenue",
        "Run the active movie revenue model for a USD budget and one or more supported genres. Include any other required active-model features.",
        MoviePredictionArguments,
        predict_movie_revenue_tool,
    ),
    "simulate_budget_shock": ToolDefinition(
        "simulate_budget_shock",
        "Compare active-model revenue predictions for the same movie before and after a signed budget percentage change. This is not a causal estimate.",
        BudgetShockArguments,
        simulate_budget_shock_tool,
    ),
    "get_active_movie_model": ToolDefinition(
        "get_active_movie_model",
        "Return active movie model metadata, supported features, genre vocabulary, currency, metrics, and limitations.",
        GetActiveMovieModelArguments,
        get_active_movie_model_tool,
    ),
    "get_movie_dataset_statistics": ToolDefinition(
        "get_movie_dataset_statistics",
        "Return verified summary statistics from the authorized approved movie dataset. The dataset_id comes from server-authorized context.",
        MovieDatasetStatisticsArguments,
        get_movie_dataset_statistics_tool,
    ),
    "query_movie_analytics": ToolDefinition(
        "query_movie_analytics",
        "Run one predefined movie analytics operation on the authorized approved dataset. Supported operations are average_revenue_by_genre, revenue_by_budget_bucket, movie_count_by_genre, and budget_revenue_scatter. The dataset_id comes from server-authorized context.",
        MovieAnalyticsArguments,
        query_movie_analytics_tool,
    ),
}
