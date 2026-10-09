import json
import logging
import random
import time
from openai import OpenAI, RateLimitError, APITimeoutError, APIConnectionError, BadRequestError
from pydantic import BaseModel, ValidationError
from app.core import settings

LOG = logging.getLogger(__name__)


class OpenRouterClient:
    def __init__(self):
        cfg = settings()
        self.client = OpenAI(api_key=cfg.openrouter_api_key, base_url=cfg.openrouter_base_url, timeout=cfg.openrouter_timeout_seconds, max_retries=0)
        self.config = cfg

    def _create(self, **kwargs):
        cfg = self.config
        for attempt in range(cfg.openrouter_max_retries + 1):
            try:
                return self.client.chat.completions.create(model=cfg.openrouter_model, **kwargs)
            except (RateLimitError, APITimeoutError, APIConnectionError) as exc:
                LOG.warning("OpenRouter request failed", extra={"error_type": type(exc).__name__, "attempt": attempt})
                if attempt == cfg.openrouter_max_retries:
                    raise
                raw = getattr(getattr(exc, "response", None), "headers", {}).get("Retry-After")
                try:
                    retry_after = float(raw) if raw else 0
                except ValueError:
                    retry_after = 0
                time.sleep(max(retry_after, 2 ** attempt + random.random()))
        raise RuntimeError("OpenRouter retries exhausted")

    def json_completion(self, payload: dict, response_model: type[BaseModel]) -> BaseModel:
        messages = [
            {"role": "system", "content": "Return only valid JSON. Never invent source or target columns. Confidence is heuristic."},
            {"role": "user", "content": json.dumps(payload)},
        ]
        return self.json_completion_messages(messages, response_model)

    def json_completion_messages(self, messages: list[dict], response_model: type[BaseModel]) -> BaseModel:
        request_messages = [dict(message) for message in messages]
        schema_instruction = (
            "Return one JSON object matching this schema exactly. Include every required field, "
            "use the specified field names and types, and do not wrap the JSON in Markdown.\n"
            f"Schema: {json.dumps(response_model.model_json_schema(), separators=(',', ':'))}"
        )
        system_index = next((i for i, message in enumerate(request_messages) if message.get("role") == "system"), None)
        if system_index is None:
            request_messages.insert(0, {"role": "system", "content": schema_instruction})
        else:
            existing = request_messages[system_index].get("content") or ""
            request_messages[system_index]["content"] = f"{existing}\n\n{schema_instruction}"

        for repair_attempt in range(2):
            kwargs = {"messages": request_messages}
            if self.config.openrouter_json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            try:
                response = self._create(**kwargs)
            except BadRequestError:
                if "response_format" not in kwargs:
                    raise
                kwargs.pop("response_format")
                response = self._create(**kwargs)

            content = response.choices[0].message.content
            try:
                return response_model.model_validate_json(content or "")
            except ValidationError as exc:
                if repair_attempt == 1:
                    raise
                errors = json.dumps(exc.errors(include_input=False), default=str)
                LOG.warning(
                    "OpenRouter JSON response failed validation; requesting one corrected response",
                    extra={"error_type": type(exc).__name__},
                )
                request_messages.extend([
                    {"role": "assistant", "content": content or ""},
                    {
                        "role": "user",
                        "content": (
                            "The previous JSON response did not match the required schema. "
                            f"Validation errors: {errors}. Return a complete corrected JSON object only."
                        ),
                    },
                ])
        raise RuntimeError("OpenRouter JSON validation retries exhausted")

    def tool_completion(self, messages: list[dict], tools: list[dict]):
        return self._create(messages=messages, tools=tools, tool_choice="auto")

    def final_completion(self, messages: list[dict]):
        return self._create(messages=messages)
