import json
from types import SimpleNamespace

import httpx
import joblib
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from lightgbm import LGBMRegressor
from openai import RateLimitError
from pydantic import ValidationError
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

from app.agent.orchestrator import ChatOrchestrator
from app.agent.schemas import ChatDecision, ChatExplanation, ChatRequest, ToolCall
from app.agent.tool_executor import execute_tool
from app.agent.tools.movie_scenario import simulate_budget_shock_tool
from app.core import Settings
from app.dashboards.schemas import DashboardSpec
from app.ml.genres import MultiHotGenreEncoder
from app.pipeline import active_movie_model_metadata, digest


class FakeInstructor:
    def __init__(self, decision=None, answer="Grounded in the model result.", decision_error=None, answer_error=None):
        self.decision = decision or ChatDecision(
            intent="general_question", requires_tools=False, reasoning_summary="No model lookup is needed."
        )
        self.answer = answer
        self.decision_error = decision_error
        self.answer_error = answer_error
        self.calls = []

    def generate_structured(self, messages, response_model):
        self.calls.append((messages, response_model))
        error = self.decision_error if response_model is ChatDecision else self.answer_error
        if error:
            raise error
        if response_model is ChatDecision:
            return self.decision
        if response_model is ChatExplanation:
            return ChatExplanation(answer=self.answer)
        raise AssertionError(f"Unexpected response schema: {response_model}")


def _decision(intent, name=None, arguments=None, reasoning="The selected tool provides verified model data."):
    calls = [ToolCall(tool_name=name, arguments=arguments or {})] if name else []
    return ChatDecision(intent=intent, requires_tools=bool(calls), tool_calls=calls, reasoning_summary=reasoning)


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


def test_instructor_decision_runs_real_lightgbm_prediction(real_model):
    client = FakeInstructor(decision=_decision(
        "prediction", "predict_movie_revenue", {"budget": 2_000_000, "genres": ["Action", "Sci-Fi"], "currency": "USD"}
    ))
    result = ChatOrchestrator(client).respond(None, ChatRequest(message="Predict revenue for an Action and Sci-Fi movie with a $2 million budget."))

    assert result["tool_execution"]["mode"] == "instructor_json"
    assert result["tool_execution"]["intent"] == "prediction"
    assert result["tool_execution"]["results"][0]["ok"] is True
    prediction = result["tool_execution"]["results"][0]["data"]
    assert prediction["model_version"] == real_model.id
    assert prediction["currency"] == "USD"
    assert prediction["inputs"]["genres"] == ["Action", "Sci-Fi"]
    assert isinstance(prediction["prediction"]["revenue"], float)
    assert client.calls[0][1] is ChatDecision
    assert client.calls[1][1] is ChatExplanation
    planning_prompt = client.calls[0][0][0]["content"]
    assert '"tool_name": "predict_movie_revenue"' in planning_prompt
    assert '"budget"' in planning_prompt


def test_scenario_uses_authorized_baseline_and_real_model(real_model):
    client = FakeInstructor(decision=_decision(
        "scenario_comparison", "simulate_budget_shock", {
            "budget": 8_000_000, "genres": ["Drama"], "budget_change_percent": -20,
        }
    ))
    request = ChatRequest(
        message="What if the budget is reduced by 20%?",
        scenario_context={"budget": 2_000_000, "genres": ["Action"], "currency": "USD"},
    )
    result = ChatOrchestrator(client).respond(None, request)
    scenario = result["tool_execution"]["results"][0]["data"]
    assert scenario["baseline_inputs"] == {"budget": 2_000_000, "genres": ["Action"], "currency": "USD"}
    assert scenario["modified_inputs"]["budget"] == 1_600_000
    assert scenario["baseline"]["model_version"] == scenario["modified"]["model_version"] == real_model.id
    assert scenario["causal_estimate"] is False


def test_model_information_uses_registry_tool(real_model):
    client = FakeInstructor(decision=_decision("model_information", "get_active_movie_model"))
    result = ChatOrchestrator(client).respond(None, ChatRequest(message="Which model and genres are active?"))
    metadata = result["tool_execution"]["results"][0]["data"]
    assert metadata["model_version"] == real_model.id
    assert metadata["features"]["genres"]["options"] == ["Action", "Sci-Fi", "Drama"]
    assert metadata["features"]["genres"]["multiple"] is True
    assert active_movie_model_metadata(None)["currency"] == "USD"


def test_tool_arguments_are_revalidated_and_missing_inputs_request_clarification():
    assert execute_tool(None, "read_model_file", {})["error"]["code"] == "unknown_tool"
    result = ChatOrchestrator(FakeInstructor(decision=_decision("prediction", "predict_movie_revenue", {"genres": ["Action"]}))).respond(
        None, ChatRequest(message="Predict revenue for an Action movie.")
    )
    assert result["needs_input"] is True
    assert "budget" in result["answer"].lower()
    assert result["tool_execution"]["results"][0]["error"]["code"] == "invalid_arguments"


def test_invalid_tool_name_is_rejected_by_decision_schema():
    with pytest.raises(ValidationError):
        ToolCall(tool_name="read_model_file", arguments={})
    with pytest.raises(ValidationError):
        ChatDecision(intent="prediction", requires_tools=False, reasoning_summary="No tool selected.")


def test_unsupported_genre_returns_structured_error(real_model):
    result = execute_tool(None, "predict_movie_revenue", {"budget": 2_000_000, "genres": ["Made Up"]})
    assert result["error"]["code"] == "unsupported_genre"


def test_rate_limit_returns_controlled_error_without_prediction():
    request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    error = RateLimitError("limited", response=httpx.Response(429, request=request), body=None)
    result = ChatOrchestrator(FakeInstructor(decision_error=error)).respond(None, ChatRequest(message="Predict revenue."))
    assert result["tool_execution"]["results"][0]["error"]["code"] == "provider_unavailable"
    assert "no prediction was generated" in result["answer"].lower()


def test_instructor_wrapped_rate_limit_remains_a_provider_error():
    request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    rate_limit = RateLimitError("limited", response=httpx.Response(429, request=request), body=None)
    exhausted = RuntimeError("Instructor retries exhausted")
    exhausted.__cause__ = rate_limit
    result = ChatOrchestrator(FakeInstructor(decision_error=exhausted)).respond(None, ChatRequest(message="Predict revenue."))
    assert result["tool_execution"]["results"][0]["error"]["code"] == "provider_unavailable"
    assert "instructor retries exhausted" not in json.dumps(result).lower()


def test_invalid_structured_decision_returns_safe_error():
    result = ChatOrchestrator(FakeInstructor(decision_error=ValueError("invalid schema output"))).respond(
        None, ChatRequest(message="Predict revenue.")
    )
    assert result["tool_execution"]["results"][0]["error"]["code"] == "invalid_model_response"
    assert "no prediction was generated" in result["answer"].lower()


def test_failed_inference_never_gets_explained_as_a_prediction(real_model, monkeypatch):
    monkeypatch.setattr("app.agent.tools.movie_prediction.predict_movie_revenue", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("artifact unavailable")))
    client = FakeInstructor(decision=_decision("prediction", "predict_movie_revenue", {"budget": 2_000_000, "genres": ["Action"]}))
    result = ChatOrchestrator(client).respond(None, ChatRequest(message="Predict revenue for an Action movie."))
    assert result["tool_execution"]["results"][0]["ok"] is False
    assert result["tool_execution"]["results"][0]["error"]["code"] == "tool_execution_failed"
    assert "no complete answer" in result["answer"].lower()
    assert "artifact unavailable" not in json.dumps(result)
    assert len(client.calls) == 1


def test_explanation_failure_preserves_real_structured_result(real_model):
    client = FakeInstructor(
        decision=_decision("prediction", "predict_movie_revenue", {"budget": 2_000_000, "genres": ["Action"]}),
        answer_error=ValueError("invalid explanation"),
    )
    result = ChatOrchestrator(client).respond(None, ChatRequest(message="Predict revenue for an Action movie."))
    assert result["tool_execution"]["results"][0]["ok"] is True
    assert real_model.id in json.dumps(result)
    assert "structured tool result" in result["answer"]


def test_dashboard_request_without_evidence_asks_for_required_context():
    result = ChatOrchestrator(FakeInstructor(decision=_decision("dashboard_generation"))).respond(
        None, ChatRequest(message="Generate a movie dashboard.")
    )
    assert result["tool_execution"]["results"] == []
    assert "approved historical dataset" in result["answer"]


def test_analytics_tool_uses_only_authorized_dataset_context(monkeypatch):
    seen = {}

    def run_tool(_db, name, arguments):
        seen.update(name=name, arguments=arguments)
        return {"ok": True, "tool": name, "data": {"dataset_id": arguments["dataset_id"]}}

    monkeypatch.setattr("app.agent.orchestrator.execute_tool", run_tool)
    decision = _decision("historical_analysis", "query_movie_analytics", {
        "dataset_id": "attacker-chosen-dataset", "operation": "movie_count_by_genre",
    })
    result = ChatOrchestrator(FakeInstructor(decision=decision)).respond(
        None, ChatRequest(message="Count movies by genre.", dataset_id="authorized-dataset")
    )
    assert seen["name"] == "query_movie_analytics"
    assert seen["arguments"]["dataset_id"] == "authorized-dataset"
    assert result["tool_execution"]["results"][0]["data"]["dataset_id"] == "authorized-dataset"


def test_analytics_without_authorized_dataset_requests_selection():
    decision = _decision("historical_analysis", "get_movie_dataset_statistics")
    result = ChatOrchestrator(FakeInstructor(decision=decision)).respond(
        None, ChatRequest(message="Summarize historical movie revenue.")
    )
    assert result["needs_input"] is True
    assert "approved, validated historical dataset" in result["answer"]


def test_chat_dashboard_plan_is_bound_to_evidence_results(monkeypatch):
    result_id = "c2222222-2222-4222-8222-222222222222"

    def run_tool(_db, name, _arguments):
        return {"ok": True, "tool": name, "data": {
            "result_id": result_id,
            "dashboard_data": {
                "fields": ["genre", "average_revenue"],
                "rows": [{"genre": "Action", "average_revenue": 800.0}],
            },
        }}

    class DashboardClient(FakeInstructor):
        def generate_structured(self, messages, response_model):
            self.calls.append((messages, response_model))
            if response_model is DashboardSpec:
                return DashboardSpec.model_validate({
                    "title": "Historical revenue",
                    "domain": "movie",
                    "widgets": [{
                        "id": "revenue-by-genre", "type": "bar_chart", "title": "Revenue by genre",
                        "data_ref": result_id, "x_field": "genre", "y_field": "average_revenue",
                    }],
                })
            return super().generate_structured(messages, response_model)

    monkeypatch.setattr("app.agent.orchestrator.execute_tool", run_tool)
    decision = _decision("dashboard_generation", "query_movie_analytics", {
        "dataset_id": "ignored", "operation": "average_revenue_by_genre",
    })
    result = ChatOrchestrator(DashboardClient(decision=decision)).respond(
        None, ChatRequest(message="Generate a revenue-by-genre dashboard.", dataset_id="authorized-dataset")
    )
    assert result["dashboard_error"] is None
    assert result["dashboard_spec"]["widgets"][0]["data_ref"] == result_id
    assert result["tool_execution"]["results"][0]["data"]["result_id"] == result_id


def test_chat_dashboard_spec_with_unknown_data_ref_is_rejected(monkeypatch):
    result_id = "c2222222-2222-4222-8222-222222222222"
    monkeypatch.setattr("app.agent.orchestrator.execute_tool", lambda _db, name, _args: {
        "ok": True, "tool": name, "data": {
            "result_id": result_id,
            "dashboard_data": {"fields": ["genre", "average_revenue"], "rows": []},
        },
    })

    class InvalidDashboardClient(FakeInstructor):
        def generate_structured(self, messages, response_model):
            self.calls.append((messages, response_model))
            if response_model is DashboardSpec:
                return DashboardSpec.model_validate({
                    "title": "Unverified", "domain": "movie", "widgets": [{
                        "id": "chart", "type": "bar_chart", "title": "Revenue",
                        "data_ref": "d3333333-3333-4333-8333-333333333333",
                        "x_field": "genre", "y_field": "average_revenue",
                    }],
                })
            return super().generate_structured(messages, response_model)

    result = ChatOrchestrator(InvalidDashboardClient(decision=_decision(
        "dashboard_generation", "query_movie_analytics", {"operation": "average_revenue_by_genre"}
    ))).respond(None, ChatRequest(message="Generate a dashboard.", dataset_id="authorized-dataset"))
    assert result["dashboard_spec"] is None
    assert result["dashboard_error"]["code"] == "invalid_dashboard_spec"
    assert "No dashboard was generated" in result["answer"]


def test_chat_endpoint_requires_service_token(monkeypatch):
    import app.main as main

    monkeypatch.setattr(main, "settings", lambda: SimpleNamespace(service_token="test-service-token"))
    monkeypatch.setattr(main, "ChatOrchestrator", lambda: SimpleNamespace(
        respond=lambda _db, _body: {"answer": "Ready.", "tool_execution": {"mode": "instructor_json", "calls": 0, "maximum_calls": 3, "results": []}, "needs_input": False}
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
