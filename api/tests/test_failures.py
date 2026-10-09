from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import json
import pandas as pd
import pytest
import httpx
from openai import OpenAI as RealOpenAI
from fastapi.testclient import TestClient
from app.main import app
from app.core import settings
from app.pipeline import suggest, validate_mapping, standardize, trusted, verify_model
from app.ai.instructor_client import InstructorClient
from app.agent.schemas import ChatExplanation
from app.pipeline import MappingResult


client = TestClient(app, headers={"X-Service-Token": settings().service_token})


@pytest.mark.parametrize("filename,data", [("broken.csv", b"not,a,valid\n"), ("broken.xlsx", b"not excel"), ("empty.csv", b"")])
def test_reject_invalid_upload(filename, data):
    response = client.post("/api/v1/datasets", files={"file": (filename, data)})
    assert response.status_code == 422


def test_ai_failure_preserves_manual_mapping():
    columns = [{"name": "Mystery Spend", "dtype": "float64"}]
    with patch("app.pipeline.settings") as cfg, patch("app.pipeline.ai_suggest", side_effect=TimeoutError):
        cfg.return_value.openrouter_api_key = "test-key"
        result = suggest(columns)
    assert result["unmapped_columns"] == ["Mystery Spend"]
    assert result["warnings"]


def test_reject_unknown_ai_column():
    from app.pipeline import MappingResult, Suggestion
    columns = [{"name": "Mystery Spend", "dtype": "float64"}]
    forged = MappingResult(mappings=[Suggestion(source_column="Invented", target_column="budget", confidence=.9, reason="wrong", transformation="numeric")], unmapped_columns=[], warnings=[])
    with patch("app.pipeline.settings") as cfg, patch("app.pipeline.ai_suggest", return_value=forged):
        cfg.return_value.openrouter_api_key = "test-key"
        result = suggest(columns)
    assert result["unmapped_columns"] == ["Mystery Spend"]


def test_reject_path_outside_storage():
    with pytest.raises(ValueError):
        trusted("/etc/passwd")


def test_standardization_rejects_negative_financial_values(tmp_path):
    source = tmp_path / "data.csv"
    pd.DataFrame({"budget": [-1] + [100] * 19, "genre": ["Drama"] * 20, "planned_duration": [20] * 20, "revenue": [1000] * 20}).to_csv(source, index=False)
    mapping = {"mappings": [{"source_column": field, "target_column": field} for field in ["budget", "genre", "planned_duration", "revenue"]]}
    with pytest.raises(ValueError, match="Negative"):
        standardize(source, mapping, tmp_path / "out.csv")


def test_structured_client_uses_instructor_json_and_bounded_retries():
    calls = []

    class FakeCompletions:
        def create(self, **kwargs):
            calls.append(kwargs)
            return {"mappings": [], "unmapped_columns": ["Mystery"], "warnings": []}

    fake = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    with patch("app.ai.instructor_client.OpenAI") as sdk, patch("app.ai.instructor_client.instructor.from_openai", return_value=fake) as wrap:
        client = InstructorClient()
        result = client.json_completion({}, MappingResult)

    import instructor
    assert result.unmapped_columns == ["Mystery"]
    assert wrap.call_args.kwargs["mode"] is instructor.Mode.JSON
    assert sdk.call_args.kwargs["max_retries"] == 0
    assert calls[0]["response_model"] is MappingResult
    assert calls[0]["max_retries"] == 2


def test_structured_client_revalidates_injected_response():
    fake = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **_kwargs: {
        "mappings": [], "unmapped_columns": ["Mystery"], "warnings": [],
    })))
    with patch("app.ai.instructor_client.OpenAI"), patch("app.ai.instructor_client.instructor.from_openai", return_value=fake):
        result = InstructorClient().json_completion({}, MappingResult)
    assert isinstance(result, MappingResult)


def test_instructor_json_mode_repairs_invalid_output_with_mocked_provider():
    contents = iter(['{"answer":', '{"answer":"Validated answer"}'])
    requests = []
    http_clients = []

    def handler(request):
        requests.append(json.loads(request.content))
        content = next(contents)
        response = {
            "id": "chatcmpl-test", "object": "chat.completion", "created": 1, "model": "fixture",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        }
        return httpx.Response(200, json=response, request=request)

    def openai_factory(**kwargs):
        http_client = httpx.Client(transport=httpx.MockTransport(handler))
        http_clients.append(http_client)
        return RealOpenAI(**kwargs, http_client=http_client)

    cfg = SimpleNamespace(
        openrouter_api_key="test-key", openrouter_base_url="https://openrouter.test/v1",
        openrouter_timeout_seconds=3, openrouter_model="fixture-model", ai_max_retries=1,
    )
    try:
        with patch("app.ai.instructor_client.settings", return_value=cfg), patch("app.ai.instructor_client.OpenAI", side_effect=openai_factory):
            result = InstructorClient().generate_structured(
                [{"role": "user", "content": "Return an answer."}], ChatExplanation
            )
    finally:
        for http_client in http_clients:
            http_client.close()

    assert result.answer == "Validated answer"
    assert len(requests) == 2
    assert requests[0]["response_format"] == {"type": "json_object"}
    assert requests[0]["model"] == "fixture-model"


def test_missing_and_corrupt_model_artifact(tmp_path):
    from app.core import Settings
    fake = SimpleNamespace(artifact_path=str(tmp_path), artifact_checksum="0" * 64, manifest={})
    with patch("app.pipeline.settings", return_value=Settings(storage_root=tmp_path)):
        with pytest.raises(ValueError, match="incomplete"):
            verify_model(fake)
        for name in ["manifest.json", "model.joblib", "metrics.json"]:
            (tmp_path / name).write_text("{}")
        with pytest.raises(ValueError, match="checksum"):
            verify_model(fake)
