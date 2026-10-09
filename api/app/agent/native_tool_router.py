import json
from dataclasses import dataclass
from typing import Any


def _get(value: Any, name: str, default=None):
    if isinstance(value, dict):
        return value.get(name, default)
    return getattr(value, name, default)


@dataclass
class NativeToolCall:
    call_id: str
    name: str
    arguments: Any


def extract_native_tool_calls(response: Any) -> tuple[list[NativeToolCall], str | None]:
    choices = _get(response, "choices", [])
    if not choices:
        raise ValueError("OpenRouter returned no chat choices")
    message = _get(choices[0], "message")
    raw_calls = _get(message, "tool_calls") or []
    calls = []
    for index, call in enumerate(raw_calls):
        function = _get(call, "function")
        name = _get(function, "name")
        arguments = _get(function, "arguments")
        if isinstance(arguments, str):
            try:
                arguments = json.loads(arguments)
            except json.JSONDecodeError:
                arguments = arguments
        calls.append(NativeToolCall(
            call_id=_get(call, "id", f"call-{index}"),
            name=name if isinstance(name, str) else "",
            arguments=arguments,
        ))
    content = _get(message, "content")
    return calls, content if isinstance(content, str) else None
