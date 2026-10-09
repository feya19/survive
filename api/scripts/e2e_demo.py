import os
import sys
import time
from pathlib import Path
import httpx
from generate_demo_dataset import generate

BASE = os.getenv("API_URL", "http://localhost:8000")
TOKEN = os.getenv("SERVICE_TOKEN", "replace-with-long-random-token")
client = httpx.Client(base_url=BASE, headers={"X-Service-Token": TOKEN}, timeout=30)


def call(method, path, **kwargs):
    response = client.request(method, path, **kwargs)
    response.raise_for_status()
    return response.json()


def train_one(dataset_path):
    with open(dataset_path, "rb") as file:
        dataset = call("POST", "/api/v1/datasets", files={"file": (Path(dataset_path).name, file)})
    dataset_id = dataset["dataset_id"]
    profile = call("GET", f"/api/v1/datasets/{dataset_id}/profile")
    assert len(profile["columns"]) == 5
    suggestion = call("POST", f"/api/v1/datasets/{dataset_id}/mapping/suggest")
    mappings = suggestion["mappings"]
    assert len(mappings) == 5, suggestion
    rejected = client.post(f"/api/v1/datasets/{dataset_id}/validate")
    assert rejected.status_code == 409
    # Exercise human override, even when the deterministic guess is correct.
    mappings[0]["reason"] = "Reviewed and confirmed by producer"
    call("PUT", f"/api/v1/datasets/{dataset_id}/mapping", json={"mappings": mappings})
    call("POST", f"/api/v1/datasets/{dataset_id}/mapping/approve")
    validated = call("POST", f"/api/v1/datasets/{dataset_id}/validate")
    job = call("POST", "/api/v1/training/jobs", json={"dataset_version_id": validated["standardized_version_id"], "model_type": "lgbm_revenue", "target": "revenue", "parameters": {"random_seed": 42}})
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        status = call("GET", f"/api/v1/training/jobs/{job['job_id']}")
        if status["status"] == "completed":
            assert status["metrics"]["mae"] >= 0
            return status["model_version_id"]
        if status["status"] == "failed":
            raise RuntimeError(status["error"])
        time.sleep(2)
    raise TimeoutError("Training did not complete")


if __name__ == "__main__":
    file1, file2 = "demo_1.csv", "demo_2.xlsx"
    generate(file1, seed=42)
    generate(file2, seed=52)
    first = train_one(file1)
    call("POST", f"/api/v1/models/{first}/promote", json={"approved": True, "approved_by": "e2e"})
    request = {"budget": 1500000, "genre": "Drama", "planned_duration": 45, "marketing_budget": 250000}
    assert call("POST", "/api/v1/predictions/revenue", json=request)["model_version"] == first
    second = train_one(file2)
    call("POST", f"/api/v1/models/{second}/promote", json={"approved": True, "approved_by": "e2e"})
    assert call("POST", "/api/v1/predictions/revenue", json=request)["model_version"] == second
    call("POST", f"/api/v1/models/{first}/rollback", json={"approved": True, "approved_by": "e2e"})
    assert call("POST", "/api/v1/predictions/revenue", json=request)["model_version"] == first
    print("E2E PASS", first, second)
