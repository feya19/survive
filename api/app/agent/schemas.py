from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.analytics.schemas import MovieAnalyticsOperation


class StrictArguments(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MoviePredictionArguments(StrictArguments):
    budget: Decimal = Field(ge=0, allow_inf_nan=False, description="Production budget in USD")
    genres: list[str] = Field(min_length=1, max_length=16)
    currency: Literal["USD"] = "USD"
    planned_duration: Decimal | None = Field(default=None, ge=0, allow_inf_nan=False)
    marketing_budget: Decimal | None = Field(default=None, ge=0, allow_inf_nan=False)

    @field_validator("genres")
    @classmethod
    def clean_genres(cls, values: list[str]) -> list[str]:
        result = []
        seen = set()
        for value in values:
            label = value.strip()
            if not label:
                raise ValueError("Genres cannot be empty")
            if len(label) > 80:
                raise ValueError("Genre labels must be at most 80 characters")
            if label.casefold() in seen:
                raise ValueError("Duplicate genres are not allowed")
            seen.add(label.casefold())
            result.append(label)
        return result


class BudgetShockArguments(MoviePredictionArguments):
    budget_change_percent: Decimal = Field(ge=-100, le=1000, allow_inf_nan=False, description="Signed percentage change to the USD budget")


class GetActiveMovieModelArguments(StrictArguments):
    pass


class MovieDatasetStatisticsArguments(StrictArguments):
    dataset_id: str | None = Field(default=None, min_length=1, max_length=36)


class MovieAnalyticsArguments(StrictArguments):
    dataset_id: str | None = Field(default=None, min_length=1, max_length=36)
    operation: MovieAnalyticsOperation
    genre: str | None = Field(default=None, min_length=1, max_length=80)
    budget_bucket_size: Decimal = Field(default=Decimal("1000000"), gt=0, allow_inf_nan=False)
    max_points: int = Field(default=500, ge=1, le=500)


class ToolCall(StrictArguments):
    tool_name: Literal[
        "predict_movie_revenue",
        "simulate_budget_shock",
        "get_active_movie_model",
        "get_movie_dataset_statistics",
        "query_movie_analytics",
    ]
    arguments: dict[str, Any] = Field(default_factory=dict)


class ChatDecision(StrictArguments):
    intent: Literal[
        "prediction",
        "scenario_comparison",
        "historical_analysis",
        "dashboard_generation",
        "model_information",
        "general_question",
    ]
    requires_tools: bool
    tool_calls: list[ToolCall] = Field(default_factory=list, max_length=3)
    reasoning_summary: str = Field(max_length=500)

    @model_validator(mode="after")
    def validate_plan(self):
        if self.requires_tools != bool(self.tool_calls):
            raise ValueError("requires_tools must match whether tool_calls are present")
        required_tools = {
            "prediction": "predict_movie_revenue",
            "scenario_comparison": "simulate_budget_shock",
            "model_information": "get_active_movie_model",
        }
        required_tool = required_tools.get(self.intent)
        selected_tools = {call.tool_name for call in self.tool_calls}
        if required_tool and required_tool not in selected_tools:
            raise ValueError(f"{self.intent} must select {required_tool}")
        if self.intent == "historical_analysis" and not selected_tools.intersection({"get_movie_dataset_statistics", "query_movie_analytics"}):
            raise ValueError("historical_analysis must select an analytics tool")
        if self.intent == "general_question" and self.tool_calls:
            raise ValueError("General questions cannot select movie model tools")
        return self


class ChatExplanation(StrictArguments):
    answer: str = Field(min_length=1, max_length=4000)


class ChatTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class MovieScenarioContext(MoviePredictionArguments):
    name: str | None = Field(default=None, max_length=255)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=4000)
    conversation: list[ChatTurn] = Field(default_factory=list, max_length=12)
    scenario_context: MovieScenarioContext | None = None
    dataset_id: str | None = Field(default=None, min_length=1, max_length=36)


class ChatResponse(BaseModel):
    answer: str
    tool_execution: dict
    needs_input: bool = False
    dashboard_spec: dict[str, Any] | None = None
    dashboard_error: dict[str, str] | None = None
