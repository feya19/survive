"""Structured OpenRouter calls shared by mapping and chat orchestration."""

import json
from typing import TypeVar

import instructor
from openai import OpenAI
from pydantic import BaseModel

from app.core import settings

ResponseT = TypeVar("ResponseT", bound=BaseModel)


class InstructorClient:
    def __init__(self):
        cfg = settings()
        openai_client = OpenAI(
            api_key=cfg.openrouter_api_key,
            base_url=cfg.openrouter_base_url,
            timeout=cfg.openrouter_timeout_seconds,
            # Instructor owns bounded validation retries; avoid hidden SDK retries.
            max_retries=0,
        )
        self.client = instructor.from_openai(openai_client, mode=instructor.Mode.JSON)
        self.model = cfg.openrouter_model
        self.max_retries = max(0, min(cfg.ai_max_retries, 4))

    def generate_structured(
        self,
        messages: list[dict],
        response_model: type[ResponseT],
    ) -> ResponseT:
        """Return only a validated Pydantic object, with bounded Instructor retries."""
        result = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            response_model=response_model,
            max_retries=self.max_retries,
        )
        if not isinstance(result, response_model):
            # Keep the trust boundary explicit if an Instructor/version integration changes.
            result = response_model.model_validate(result)
        return result

    def json_completion(self, payload: dict, response_model: type[ResponseT]) -> ResponseT:
        messages = [
            {"role": "system", "content": "Return structured output matching the requested schema. Never invent source or target columns. Confidence is heuristic."},
            {"role": "user", "content": json.dumps(payload, default=str)},
        ]
        return self.generate_structured(messages, response_model)

    def json_completion_messages(
        self,
        messages: list[dict],
        response_model: type[ResponseT],
    ) -> ResponseT:
        return self.generate_structured(messages, response_model)


# Compatibility name for existing integration points while they migrate.
OpenRouterClient = InstructorClient
