import json
import logging
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.agent.tool_registry import TOOL_REGISTRY
from app.pipeline import MovieInputError, ModelChangedError

LOG = logging.getLogger(__name__)


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
        return {"ok": True, "tool": name, "data": data}
    except Exception as exc:
        LOG.warning("Chat tool failed", extra={"tool": name, "error_type": type(exc).__name__})
        message = str(exc) if isinstance(exc, (MovieInputError, ModelChangedError)) else "The model operation failed; no prediction was generated."
        return {
            "ok": False,
            "tool": name,
            "error": {"code": getattr(exc, "code", "tool_execution_failed"), "message": message[:500]},
        }
