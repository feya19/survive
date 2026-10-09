from dataclasses import dataclass
from typing import Callable

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agent.schemas import BudgetShockArguments, GetActiveMovieModelArguments, MoviePredictionArguments
from app.agent.tools.model_information import get_active_movie_model_tool
from app.agent.tools.movie_prediction import predict_movie_revenue_tool
from app.agent.tools.movie_scenario import simulate_budget_shock_tool


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    arguments_model: type[BaseModel]
    handler: Callable[[Session, BaseModel], dict]

    def openai_schema(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.arguments_model.model_json_schema(),
            },
        }


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
}


def openai_tool_schemas() -> list[dict]:
    return [tool.openai_schema() for tool in TOOL_REGISTRY.values()]
