from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import httpx
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core import settings
from app.pipeline import suggest, validate_mapping, standardize, trusted, verify_model
from app.integrations.openrouter_client import OpenRouterClient
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


def test_openrouter_rate_limit_retries():
    from openai import RateLimitError
    response = httpx.Response(429, headers={"Retry-After": "0"}, request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"))
    error = RateLimitError("limited", response=response, body=None)
    valid = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content='{"mappings":[],"unmapped_columns":[],"warnings":[]}'))])
    with patch("app.integrations.openrouter_client.OpenAI") as sdk, patch("app.integrations.openrouter_client.time.sleep"):
        sdk.return_value.chat.completions.create.side_effect = [error, valid]
        result = OpenRouterClient().json_completion({}, MappingResult)
    assert result.mappings == []
    assert sdk.return_value.chat.completions.create.call_count == 2


def test_openrouter_malformed_json():
    invalid = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="not json"))])
    with patch("app.integrations.openrouter_client.OpenAI") as sdk:
        sdk.return_value.chat.completions.create.return_value = invalid
        with pytest.raises(Exception):
            OpenRouterClient().json_completion({}, MappingResult)
        assert sdk.return_value.chat.completions.create.call_count == 2


def test_openrouter_repairs_invalid_json_response():
    invalid = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content='{"suggestions": []}'))])
    valid = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content='{"mappings": [], "unmapped_columns": ["Mystery"], "warnings": []}'))])
    with patch("app.integrations.openrouter_client.OpenAI") as sdk:
        sdk.return_value.chat.completions.create.side_effect = [invalid, valid]
        result = OpenRouterClient().json_completion({}, MappingResult)

    assert result.unmapped_columns == ["Mystery"]
    assert sdk.return_value.chat.completions.create.call_count == 2
    first_messages = sdk.return_value.chat.completions.create.call_args_list[0].kwargs["messages"]
    retry_messages = sdk.return_value.chat.completions.create.call_args_list[1].kwargs["messages"]
    assert "unmapped_columns" in first_messages[0]["content"]
    assert "Validation errors" in retry_messages[-1]["content"]


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
