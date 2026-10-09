from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.dashboards.planner import DashboardPlanner
from app.dashboards.schemas import DashboardSpec
from app.dashboards.templates import get_template, template_list
from app.dashboards.validator import DashboardValidationError, validate_dashboard_spec


def _evidence(result_id=None):
    return [{
        "ok": True,
        "tool": "query_movie_analytics",
        "data": {
            "result_id": result_id or str(uuid4()),
            "dashboard_data": {
                "fields": ["genre", "average_revenue", "movie_count"],
                "rows": [{"genre": "Action", "average_revenue": 500.0, "movie_count": 4}],
            },
        },
    }]


def _spec(result_id, metric_field="average_revenue"):
    return DashboardSpec.model_validate({
        "title": "Revenue by genre",
        "domain": "movie",
        "widgets": [{
            "id": "genre-revenue",
            "type": "bar_chart",
            "title": "Average revenue by genre",
            "data_ref": result_id,
            "x_field": "genre",
            "y_field": metric_field,
            "width": 12,
        }],
    })


class FakePlannerClient:
    def __init__(self, spec):
        self.spec = spec

    def generate_structured(self, messages, response_model):
        assert response_model is DashboardSpec
        assert "result_id" in messages[1]["content"]
        return self.spec


def test_generated_dashboard_uses_verified_source_and_fields():
    evidence = _evidence()
    ref = evidence[0]["data"]["result_id"]
    spec = DashboardPlanner(FakePlannerClient(_spec(ref))).generate("Show revenue by genre", evidence)
    assert str(spec.widgets[0].data_ref) == ref
    assert spec.widgets[0].x_field == "genre"


def test_dashboard_rejects_hallucinated_result_references_and_fields():
    evidence = _evidence()
    with pytest.raises(DashboardValidationError, match="not produced"):
        validate_dashboard_spec(_spec(str(uuid4())), evidence)

    ref = evidence[0]["data"]["result_id"]
    with pytest.raises(DashboardValidationError, match="unavailable fields"):
        validate_dashboard_spec(_spec(ref, "investment_return"), evidence)


def test_dashboard_schema_rejects_unsupported_widget_and_layout():
    ref = str(uuid4())
    with pytest.raises(ValidationError):
        DashboardSpec.model_validate({
            "title": "Invalid", "domain": "movie", "widgets": [{
                "id": "bad", "type": "html", "title": "Invalid", "data_ref": ref,
            }],
        })
    with pytest.raises(ValidationError):
        DashboardSpec.model_validate({
            "title": "Overflow", "domain": "movie", "widgets": [{
                "id": "wide", "type": "kpi", "title": "Revenue", "data_ref": ref,
                "metric_field": "average_revenue", "width": 8, "x": 5,
            }],
        })


def test_prebuilt_templates_use_supported_shared_widget_types():
    templates = template_list()
    assert {item["id"] for item in templates} == {"movie_revenue_overview", "budget_scenario_comparison"}
    overview = get_template("movie_revenue_overview")
    assert all(widget["type"] in {"kpi", "bar_chart", "line_chart", "scatter_chart", "comparison", "data_table", "ai_insight"} for widget in overview["widgets"])
    assert get_template("missing") is None
