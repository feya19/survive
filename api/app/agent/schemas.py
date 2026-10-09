from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class ToolRoute(StrictArguments):
    tool: str
    arguments: dict


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


class ChatResponse(BaseModel):
    answer: str
    tool_execution: dict
    needs_input: bool = False
