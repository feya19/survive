from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


WidgetType = Literal[
    "kpi",
    "bar_chart",
    "line_chart",
    "scatter_chart",
    "comparison",
    "data_table",
    "ai_insight",
]


class StrictDashboardModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DashboardFilter(StrictDashboardModel):
    field: str = Field(min_length=1, max_length=80)
    operator: Literal["eq", "neq", "gt", "gte", "lt", "lte", "contains"]
    value: str | float | int | bool


class WidgetSpec(StrictDashboardModel):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    type: WidgetType
    title: str = Field(min_length=1, max_length=120)
    data_ref: UUID
    x_field: str | None = Field(default=None, min_length=1, max_length=80)
    y_field: str | None = Field(default=None, min_length=1, max_length=80)
    metric_field: str | None = Field(default=None, min_length=1, max_length=80)
    series_fields: list[str] = Field(default_factory=list, max_length=8)
    table_fields: list[str] = Field(default_factory=list, max_length=16)
    filters: list[DashboardFilter] = Field(default_factory=list, max_length=12)
    display_format: Literal["number", "currency", "percent", "date", "text"] = "number"
    width: int = Field(default=6, ge=1, le=12)
    height: int = Field(default=3, ge=1, le=8)
    x: int = Field(default=0, ge=0, le=11)
    y: int = Field(default=0, ge=0, le=24)
    insight_text: str | None = Field(default=None, max_length=1000)

    @field_validator("series_fields", "table_fields")
    @classmethod
    def unique_fields(cls, value: list[str]) -> list[str]:
        if len({field.casefold() for field in value}) != len(value):
            raise ValueError("Field lists must not contain duplicates")
        return value

    @model_validator(mode="after")
    def validate_widget_contract(self):
        if self.type in {"bar_chart", "line_chart", "scatter_chart"} and not (self.x_field and self.y_field):
            raise ValueError("Chart widgets require x_field and y_field")
        if self.type == "kpi" and not self.metric_field:
            raise ValueError("KPI widgets require metric_field")
        if self.type == "comparison" and len(self.series_fields) < 2:
            raise ValueError("Comparison widgets require at least two series_fields")
        if self.type == "data_table" and not self.table_fields:
            raise ValueError("Data table widgets require table_fields")
        if self.type == "ai_insight" and not (self.insight_text and self.insight_text.strip()):
            raise ValueError("AI insight widgets require insight_text")
        if self.x + self.width > 12:
            raise ValueError("Widget layout must fit within the 12-column dashboard grid")
        return self


class DashboardSpec(StrictDashboardModel):
    title: str = Field(min_length=1, max_length=160)
    domain: Literal["movie"]
    description: str | None = Field(default=None, max_length=1000)
    widgets: list[WidgetSpec] = Field(min_length=1, max_length=12)

    @model_validator(mode="after")
    def unique_widget_ids(self):
        ids = [widget.id.casefold() for widget in self.widgets]
        if len(ids) != len(set(ids)):
            raise ValueError("Widget IDs must be unique")
        return self


class DashboardTemplateSummary(StrictDashboardModel):
    id: str
    title: str
    description: str
    required_sources: list[str]


class DashboardTemplate(DashboardTemplateSummary):
    widgets: list[dict[str, Any]]
