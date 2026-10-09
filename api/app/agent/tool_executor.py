import json
import logging
import uuid
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.agent.tool_registry import TOOL_REGISTRY
from app.analytics.movie_analytics import AnalyticsError
from app.pipeline import MovieInputError, ModelChangedError

LOG = logging.getLogger(__name__)


def _dashboard_data(name: str, data: dict) -> None:
    data.setdefault("result_id", str(uuid.uuid4()))
    if "dashboard_data" in data:
        return
    if name == "predict_movie_revenue":
        values = data.get("inputs", {})
        prediction = data.get("prediction", {})
        data["dashboard_data"] = {
            "fields": ["budget", "revenue", "genres", "model_version", "currency"],
            "rows": [{
                "budget": values.get("budget"), "revenue": prediction.get("revenue"),
                "genres": values.get("genres"), "model_version": data.get("model_version"),
                "currency": data.get("currency"),
            }],
        }
    elif name == "simulate_budget_shock":
        data["dashboard_data"] = {
            "fields": ["scenario", "budget", "revenue", "model_version", "currency"],
            "rows": [
                {"scenario": "baseline", "budget": data.get("baseline_inputs", {}).get("budget"),
                 "revenue": data.get("baseline", {}).get("prediction", {}).get("revenue"),
                 "model_version": data.get("model_version"), "currency": data.get("baseline_inputs", {}).get("currency")},
                {"scenario": "modified", "budget": data.get("modified_inputs", {}).get("budget"),
                 "revenue": data.get("modified", {}).get("prediction", {}).get("revenue"),
                 "model_version": data.get("model_version"), "currency": data.get("modified_inputs", {}).get("currency")},
            ],
        }
    elif name == "get_movie_dataset_statistics":
        rows = data.get("revenue_by_genre", [])
        data["dashboard_data"] = {
            "fields": ["genre", "movie_count", "average_revenue"],
            "rows": rows,
        }
    elif name == "get_active_movie_model":
        data["dashboard_data"] = {
            "fields": ["model_version", "model_type", "prediction_type", "currency"],
            "rows": [{key: data.get(key) for key in ("model_version", "model_type", "prediction_type", "currency")}],
        }
    elif isinstance(data.get("fields"), list) and isinstance(data.get("rows"), list):
        data["dashboard_data"] = {"fields": data["fields"], "rows": data["rows"]}


def execute_tool(db: Session, name: str, raw_arguments: Any) -> dict:
    if name not in TOOL_REGISTRY:
        return {"ok": False, "tool": name, "error": {"code": "unknown_tool", "message": "The requested tool is not available."}}
    tool = TOOL_REGISTRY[name]
    if isinstance(raw_arguments, str):
        try:
            raw_arguments = json.loads(raw_arguments)
        except json.JSONDecodeError:
            return {"ok": False, "tool": name, "error": {"code": "invalid_json", "message": "Tool arguments were not valid JSON."}}
    if not isinstance(raw_arguments, dict):
        return {"ok": False, "tool": name, "error": {"code": "invalid_arguments", "message": "Tool arguments must be a JSON object."}}
    try:
        args = tool.arguments_model.model_validate(raw_arguments)
    except ValidationError as exc:
        missing = [".".join(str(part) for part in item["loc"]) for item in exc.errors() if item["type"] == "missing"]
        return {
            "ok": False,
            "tool": name,
            "error": {
                "code": "invalid_arguments",
                "message": "Tool arguments did not match the required schema.",
                "fields": exc.errors(include_input=False),
                "missing_fields": missing,
            },
        }
    try:
        data = tool.handler(db, args)
        if isinstance(data, dict):
            _dashboard_data(name, data)
        return {"ok": True, "tool": name, "data": data}
    except Exception as exc:
        LOG.warning("Chat tool failed", extra={"tool": name, "error_type": type(exc).__name__})
        message = str(exc) if isinstance(exc, (MovieInputError, ModelChangedError, AnalyticsError)) else "The model operation failed; no prediction was generated."
        return {
            "ok": False,
            "tool": name,
            "error": {"code": getattr(exc, "code", "tool_execution_failed"), "message": message[:500]},
        }
