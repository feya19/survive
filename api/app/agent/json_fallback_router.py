import json

from app.agent.schemas import ToolRoute
from app.agent.tool_registry import TOOL_REGISTRY
from app.integrations.openrouter_client import OpenRouterClient


SYSTEM_PROMPT = """Route a movie question to exactly one available tool using JSON only. Never calculate or invent revenue. Never choose a tool outside the supplied allowlist. Return {\"tool\": name, \"arguments\": {...}}. For a prediction use predict_movie_revenue. For a signed budget change use simulate_budget_shock. For active model information use get_active_movie_model. Ask for missing required inputs by returning an allowed tool with its required fields omitted; the server will return a clarification request."""


def route_with_json_fallback(messages: list[dict], client: OpenRouterClient | None = None) -> ToolRoute:
    client = client or OpenRouterClient()
    payload = {
        "tools": [{"name": tool.name, "description": tool.description, "arguments": tool.arguments_model.model_json_schema()} for tool in TOOL_REGISTRY.values()],
        "conversation": messages,
    }
    result = client.json_completion_messages(
        [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": json.dumps(payload, default=str)}],
        ToolRoute,
    )
    return result
