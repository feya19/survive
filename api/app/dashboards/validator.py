from pydantic import ValidationError

from app.dashboards.schemas import DashboardSpec


class DashboardValidationError(ValueError):
    code = "invalid_dashboard_spec"


def dashboard_sources(tool_results: list[dict]) -> dict[str, dict]:
    sources = {}
    for result in tool_results:
        if not result.get("ok") or not isinstance(result.get("data"), dict):
            continue
        data = result["data"]
        result_id = data.get("result_id")
        dashboard_data = data.get("dashboard_data")
        if isinstance(result_id, str) and isinstance(dashboard_data, dict):
            sources[result_id] = {
                "result_id": result_id,
                "tool": result.get("tool"),
                "fields": list(dashboard_data.get("fields", [])),
                "rows": dashboard_data.get("rows", []),
                "data": data,
            }
    return sources


def validate_dashboard_spec(spec: DashboardSpec | dict, tool_results: list[dict]) -> DashboardSpec:
    try:
        parsed = spec if isinstance(spec, DashboardSpec) else DashboardSpec.model_validate(spec)
    except ValidationError as exc:
        raise DashboardValidationError("The dashboard specification did not pass schema validation.") from exc

    sources = dashboard_sources(tool_results)
    for widget in parsed.widgets:
        source = sources.get(str(widget.data_ref))
        if source is None:
            raise DashboardValidationError(f"Widget {widget.id} references a result that was not produced by this request.")
        allowed_fields = set(source["fields"])
        referenced = set(filter(None, [widget.x_field, widget.y_field, widget.metric_field]))
        referenced.update(widget.series_fields)
        referenced.update(widget.table_fields)
        referenced.update(condition.field for condition in widget.filters)
        unknown = referenced - allowed_fields
        if unknown:
            raise DashboardValidationError(f"Widget {widget.id} references unavailable fields: {', '.join(sorted(unknown))}.")
    return parsed
