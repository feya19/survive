from app.dashboards.schemas import DashboardTemplate


TEMPLATES = {
    "movie_revenue_overview": DashboardTemplate(
        id="movie_revenue_overview",
        title="Movie Revenue Overview",
        description="Compare one movie prediction with verified historical revenue by genre.",
        required_sources=["prediction", "dataset_statistics"],
        widgets=[
            {"id": "production_budget", "type": "kpi", "title": "Production budget", "source_key": "prediction", "metric_field": "budget", "display_format": "currency"},
            {"id": "predicted_revenue", "type": "kpi", "title": "Predicted revenue", "source_key": "prediction", "metric_field": "revenue", "display_format": "currency"},
            {"id": "revenue_by_genre", "type": "bar_chart", "title": "Historical average revenue by genre", "source_key": "dataset_statistics", "x_field": "genre", "y_field": "average_revenue", "display_format": "currency"},
            {"id": "model_version", "type": "data_table", "title": "Model provenance", "source_key": "prediction", "table_fields": ["model_version", "currency"]},
            {"id": "historical_insight", "type": "ai_insight", "title": "Historical context", "source_key": "dataset_statistics"},
        ],
    ),
    "budget_scenario_comparison": DashboardTemplate(
        id="budget_scenario_comparison",
        title="Budget Scenario Comparison",
        description="Compare verified baseline and modified budget predictions from the same active model.",
        required_sources=["budget_scenario"],
        widgets=[
            {"id": "budget_comparison", "type": "comparison", "title": "Budget and revenue scenarios", "source_key": "budget_scenario", "series_fields": ["budget", "revenue"], "display_format": "currency"},
            {"id": "scenario_chart", "type": "bar_chart", "title": "Predicted revenue by scenario", "source_key": "budget_scenario", "x_field": "scenario", "y_field": "revenue", "display_format": "currency"},
            {"id": "scenario_assumptions", "type": "ai_insight", "title": "Assumptions and limits", "source_key": "budget_scenario"},
            {"id": "scenario_data", "type": "data_table", "title": "Scenario inputs", "source_key": "budget_scenario", "table_fields": ["scenario", "budget", "revenue", "model_version"]},
        ],
    ),
}


def template_list() -> list[dict]:
    return [template.model_dump(mode="json") for template in TEMPLATES.values()]


def get_template(template_id: str) -> dict | None:
    template = TEMPLATES.get(template_id)
    return template.model_dump(mode="json") if template else None
