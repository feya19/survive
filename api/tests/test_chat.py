import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx
import joblib
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from lightgbm import LGBMRegressor
from openai import BadRequestError, RateLimitError
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

from app.agent.orchestrator import ChatOrchestrator
from app.agent.schemas import BudgetShockArguments, ChatRequest, MoviePredictionArguments, ToolRoute
from app.agent.tool_executor import execute_tool
from app.agent.tools.movie_scenario import simulate_budget_shock_tool
from app.core import Settings
from app.integrations.openrouter_client import OpenRouterClient
from app.ml.genres import MultiHotGenreEncoder
from app.pipeline import active_movie_model_metadata, digest, predict_movie_revenue


class FakeOpenRouter:
    def __init__(self, native_response=None, route=None, native_error=None, final_text="Grounded in the model result."):
        self.native_response = native_response
        self.route = route
        self.native_error = native_error
        self.final_text = final_text
        self.final_calls = 0

    def tool_completion(self, messages, tools):
        if self.native_error:
            raise self.native_error
        return self.native_response

    def json_completion_messages(self, messages, response_model):
        if isinstance(self.route, Exception):
            raise self.route
        return self.route

    def final_completion(self, messages):
        self.final_calls += 1
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=self.final_text))])


def _tool_response(name, arguments):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(
        content=None,
        tool_calls=[SimpleNamespace(id="call-1", function=SimpleNamespace(name=name, arguments=json.dumps(arguments)))],
    ))])


@pytest.fixture
def real_model(tmp_path, monkeypatch):
    vocabulary = ["Action", "Sci-Fi", "Drama"]
    X = pd.DataFrame({
        "budget": [float(100_000 + i * 10_000) for i in range(30)],
        "genre": [vocabulary[i % len(vocabulary)] for i in range(30)],
    })
    y = np.asarray([float(250_000 + i * 25_000) for i in range(30)])
    pipeline = Pipeline([
        ("preprocessor", ColumnTransformer([
            ("numeric", SimpleImputer(strategy="median"), ["budget"]),
            ("genre", MultiHotGenreEncoder(categories=vocabulary), ["genre"]),
        ])),
        ("regressor", LGBMRegressor(n_estimators=12, num_leaves=5, random_state=7, n_jobs=1, verbosity=-1)),
    ])
    pipeline.fit(X, y)
    folder = tmp_path / "model"
    folder.mkdir()
    manifest = {
        "model_type": "lgbm_revenue", "artifact_version": "2",
        "training_dataset_version": "test-dataset", "target": "revenue",
        "feature_columns": ["budget", "genre"], "output_type": "point_prediction",
        "model_file": "model.joblib", "currency": "USD", "estimator": "lightgbm.LGBMRegressor",
        "genre_vocabulary": vocabulary, "supports_multiple_genres": True, "genre_encoding": "multi_hot_v1",
    }
    model_path = folder / "model.joblib"
    joblib.dump(pipeline, model_path)
    (folder / "manifest.json").write_text(json.dumps(manifest))
    (folder / "metrics.json").write_text(json.dumps({"mae": 1.0, "rmse": 1.5}))
    model = SimpleNamespace(
        id="model-test-v2", model_type="lgbm_revenue", artifact_path=str(folder),
        artifact_checksum=digest(model_path), manifest=manifest, metrics={"mae": 1.0, "rmse": 1.5},
    )
    monkeypatch.setattr("app.pipeline.active_model", lambda _db: model)
    monkeypatch.setattr("app.pipeline.settings", lambda: Settings(storage_root=tmp_path))
    return model


def test_successful_native_tool_call_runs_real_lightgbm(real_model):
    client = FakeOpenRouter(
        native_response=_tool_response("predict_movie_revenue", {"budget": 2_000_000, "genres": ["Action"], "currency": "USD"}),
    )
    result = ChatOrchestrator(client).respond(None, ChatRequest(message="Predict revenue for an Action movie with a $2 million budget."))

    assert result["tool_execution"]["mode"] == "native_tools"
    assert result["tool_execution"]["results"][0]["ok"] is True
    prediction = result["tool_execution"]["results"][0]["data"]
    assert prediction["model_version"] == real_model.id
    assert prediction["currency"] == "USD"
    assert isinstance(prediction["prediction"]["revenue"], float)
    assert client.final_calls == 1


def test_json_fallback_routes_and_runs_real_lightgbm(real_model):
    response = httpx.Response(400, request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"))
    client = FakeOpenRouter(
        route=ToolRoute(tool="predict_movie_revenue", arguments={"budget": 1_500_000, "genres": ["Drama"]}),
        native_error=BadRequestError("native tools unsupported", response=response, body=None),
    )
    result = ChatOrchestrator(client).respond(None, ChatRequest(message="Predict Drama revenue for $1.5 million."))

    assert result["tool_execution"]["mode"] == "json_fallback"
    assert result["tool_execution"]["results"][0]["data"]["currency"] == "USD"
    assert result["tool_execution"]["results"][0]["data"]["model_version"] == real_model.id


def test_invalid_tool_name_is_rejected(real_model):
    response = httpx.Response(400, request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"))
    client = FakeOpenRouter(
        route=ToolRoute(tool="read_model_file", arguments={}),
        native_error=BadRequestError("native tools unsupported", response=response, body=None),
    )
    result = ChatOrchestrator(client).respond(None, ChatRequest(message="Get model info."))
    assert result["tool_execution"]["results"][0]["error"]["code"] == "unknown_tool"
    assert "prediction" not in json.dumps(result["tool_execution"]["results"][0])


def test_invalid_argument_types_and_missing_budget_are_structured():
    invalid = execute_tool(None, "predict_movie_revenue", {"budget": "two million", "genres": ["Action"]})
    missing = execute_tool(None, "predict_movie_revenue", {"genres": ["Action"]})
    assert invalid["error"]["code"] == "invalid_arguments"
    assert "budget" in missing["error"]["missing_fields"]


def test_unsupported_genre_returns_structured_error(real_model):
    result = execute_tool(None, "predict_movie_revenue", {"budget": 2_000_000, "genres": ["Made Up"]})
    assert result["error"]["code"] == "unsupported_genre"


def test_active_metadata_uses_saved_vocabulary_and_usd(real_model):
    metadata = active_movie_model_metadata(None)
    assert metadata["currency"] == "USD"
    assert metadata["features"]["genres"]["options"] == ["Action", "Sci-Fi", "Drama"]
    assert metadata["features"]["genres"]["multiple"] is True


def test_budget_scenario_runs_baseline_and_modified_lightgbm_predictions(real_model):
    args = BudgetShockArguments(budget=2_000_000, genres=["Action"], budget_change_percent=-20)
    result = simulate_budget_shock_tool(None, args)
    assert result["baseline"]["model_version"] == result["modified"]["model_version"] == real_model.id
    assert result["modified_inputs"]["budget"] == 1_600_000
    assert isinstance(result["baseline"]["prediction"]["revenue"], float)
    assert result["causal_estimate"] is False


def test_authorized_scenario_context_overrides_model_generated_baseline(real_model):
    client = FakeOpenRouter(native_response=_tool_response("simulate_budget_shock", {
        "budget": 8_000_000, "genres": ["Drama"], "budget_change_percent": -20,
    }))
    request = ChatRequest(
        message="What if the budget is reduced by 20%?",
        scenario_context={"budget": 2_000_000, "genres": ["Action"], "currency": "USD"},
    )
    result = ChatOrchestrator(client).respond(None, request)
    scenario = result["tool_execution"]["results"][0]["data"]
    assert scenario["baseline_inputs"] == {"budget": 2_000_000, "genres": ["Action"], "currency": "USD"}
    assert scenario["modified_inputs"]["budget"] == 1_600_000


def test_rate_limit_returns_safe_error_without_prediction():
    request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    error = RateLimitError("limited", response=httpx.Response(429, request=request), body=None)
    result = ChatOrchestrator(FakeOpenRouter(native_error=error)).respond(None, ChatRequest(message="Predict revenue."))
    assert result["tool_execution"]["results"][0]["error"]["code"] == "provider_unavailable"
    assert "no prediction was generated" in result["answer"].lower()


def test_malformed_json_fallback_retries_once_then_returns_safe_error():
    response = httpx.Response(400, request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"))
    client = FakeOpenRouter(
        route=ValueError("invalid json"),
        native_error=BadRequestError("native tools unsupported", response=response, body=None),
    )
    result = ChatOrchestrator(client).respond(None, ChatRequest(message="Predict revenue."))
    assert result["tool_execution"]["results"][0]["error"]["code"] == "invalid_model_response"
    assert "no prediction was generated" in result["answer"].lower()


def test_inference_failure_never_gets_explained_as_a_prediction(real_model, monkeypatch):
    monkeypatch.setattr("app.agent.tools.movie_prediction.predict_movie_revenue", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("artifact unavailable")))
    client = FakeOpenRouter(native_response=_tool_response("predict_movie_revenue", {"budget": 2_000_000, "genres": ["Action"]}))
    result = ChatOrchestrator(client).respond(None, ChatRequest(message="Predict revenue for an Action movie."))
    assert result["tool_execution"]["results"][0]["ok"] is False
    assert result["tool_execution"]["results"][0]["error"]["code"] == "tool_execution_failed"
    assert "no prediction was generated" in result["answer"].lower()
    assert "artifact unavailable" not in json.dumps(result)
    assert client.final_calls == 0


def test_chat_endpoint_requires_service_token(monkeypatch):
    import app.main as main

    monkeypatch.setattr(main, "settings", lambda: SimpleNamespace(service_token="test-service-token"))
    monkeypatch.setattr(main, "ChatOrchestrator", lambda: SimpleNamespace(
        respond=lambda _db, _body: {"answer": "Ready.", "tool_execution": {"mode": "native_tools", "calls": 0, "maximum_calls": 3, "results": []}, "needs_input": False}
    ))
    main.app.dependency_overrides[main.db_session] = lambda: None
    try:
        client = TestClient(main.app)
        assert client.post("/api/v1/chat", json={"message": "Hello"}).status_code == 401
        response = client.post("/api/v1/chat", headers={"X-Service-Token": "test-service-token"}, json={"message": "Hello"})
        assert response.status_code == 200
        assert response.json()["answer"] == "Ready."
    finally:
        main.app.dependency_overrides.pop(main.db_session, None)


def test_openrouter_native_call_uses_function_tools_and_auto_choice():
    response = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="ok"))])
    with patch("app.integrations.openrouter_client.OpenAI") as sdk:
        sdk.return_value.chat.completions.create.return_value = response
        client = OpenRouterClient()
        client.tool_completion([{"role": "user", "content": "hello"}], [{"type": "function", "function": {"name": "get_active_movie_model"}}])
    kwargs = sdk.return_value.chat.completions.create.call_args.kwargs
    assert kwargs["tool_choice"] == "auto"
    assert kwargs["tools"][0]["function"]["name"] == "get_active_movie_model"
