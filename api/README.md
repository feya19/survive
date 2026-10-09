# Survive AI/ML API

FastAPI, PostgreSQL, Redis, Celery, Papermill, and Scikit-learn implement a film revenue training workflow. Swagger is at `http://localhost:8000/docs`.

## Start

Copy `.env.example` to `.env`, set a long random `SERVICE_TOKEN`, and optionally set `OPENROUTER_API_KEY`. To run the full application in Docker, also copy `../web/.env.example` to `../web/.env`, generate a Laravel `APP_KEY` as described in `../web/README.md`, then start the stack from this directory:

```bash
docker compose up -d --build
```

The stack includes the Laravel app at `http://localhost:8080`, FastAPI at `http://localhost:8000`, and the worker. The API and worker share `/data`; Laravel's SQLite database and uploaded files use persistent Docker volumes. Redis and PostgreSQL are private Compose services. Check `http://localhost:8000/ready` or run `docker compose ps`.

## Workflow

Use `X-Service-Token: <SERVICE_TOKEN>` on every `/api/v1` request. Upload CSV or XLSX to `POST /api/v1/datasets`, then inspect `GET /api/v1/datasets/{id}/profile`. `POST /api/v1/datasets/{id}/mapping/suggest` uses exact names, aliases, fuzzy matching, and OpenRouter for unresolved columns when configured. The service sends only column names and data types to OpenRouter. AI failures leave columns for manual mapping.

Submit reviewed mappings to `PUT /api/v1/datasets/{id}/mapping`:

```json
{"mappings": [{"source_column": "Production Cost", "target_column": "budget", "confidence": 1, "reason": "Reviewed", "transformation": "numeric", "requires_review": false}]}
```

Map `budget`, `genre`, and `revenue` for the LightGBM model. `planned_duration` and `marketing_budget` are optional. Then call `POST /api/v1/datasets/{id}/mapping/approve` and `POST /api/v1/datasets/{id}/validate`. The latter returns `standardized_version_id`; mapping changes require a new validation. Rows missing required fields or duplicated rows are excluded and counted. Negative financial values fail validation.

Submit `POST /api/v1/training/jobs` to execute `notebooks/lgbm_training.ipynb` with Papermill:

```json
{"dataset_version_id": "<standardized_version_id>", "model_type": "lgbm_revenue", "target": "revenue", "parameters": {"random_seed": 42}}
```

Poll `GET /api/v1/training/jobs/{job_id}`. The worker executes the fixed notebook, saves a fitted pipeline, metrics, manifest, and executed notebook, then registers a candidate. Inspect `GET /api/v1/models` and promote with `POST /api/v1/models/{model_id}/promote` and body `{"approved":true,"approved_by":"producer-id"}`. Use `POST /api/v1/models/{model_id}/rollback` with the same body for a previously deployed archived model.

Laravel sends a JSON object to `POST /api/v1/predictions/revenue`, for example:

```json
{"budget":1500000,"genre":"Drama","planned_duration":45,"marketing_budget":250000}
```

The active model manifest determines which fields are required. Movie budgets and revenue use USD; omitted currency is treated as USD, and other currencies are rejected without conversion. The response includes the exact model version and point prediction. Every API worker reads the active version from PostgreSQL for each request and loads the verified artifact before inference, so promotion needs no container rebuild.

## Movie chat and scenarios

`POST /api/v1/chat` uses the same service-token authorization. It supports conversation turns and an optional server-authorized scenario snapshot:

```json
{
  "message": "What if the budget is reduced by 20%?",
  "conversation": [{"role": "user", "content": "Predict revenue for an Action movie with a $2 million budget."}],
  "scenario_context": {"budget": 2000000, "genres": ["Action"], "currency": "USD"}
}
```

The chat endpoint routes only to the registered `predict_movie_revenue`, `simulate_budget_shock`, and `get_active_movie_model` tools. It uses OpenRouter function calling and falls back to validated JSON routing when native tool calls are unavailable or malformed. All model-generated tool arguments are validated before execution, and numerical results come from the verified active LightGBM artifact. The response includes `tool_execution` metadata and structured results; provider or inference failures return an error without a fabricated prediction. The service executes at most three native tool calls per request. Keep `scenario_context` behind the same caller authorization checks as the movie scenario it represents.

Direct inference is also available at `POST /api/v1/predictions/movie/revenue` with `{"budget":2000000,"genres":["Action"],"currency":"USD"}`. Budget comparison is available at `POST /api/v1/scenarios/movie/budget` with the same movie inputs plus `"budget_change_percent":-20`. `GET /api/v1/models/active/features` returns the active model's required features, supported genre vocabulary, and whether it accepts multiple genres.

Newly trained notebook artifacts support genre arrays and store their vocabulary in the manifest. Existing scalar-genre artifacts remain supported; they continue to accept one genre until a multi-genre compatible candidate is trained and explicitly promoted. Chat validates genre names against whichever model is active.

## Demo and tests

Run `docker compose exec fastapi-api python -m pytest -q` for unit tests. For the full two-version scenario, run `docker compose exec fastapi-api python scripts/e2e_demo.py`; the default API URL points to the same container and the token defaults to the example token. Set `API_URL` and `SERVICE_TOKEN` when using different values. The demo generates CSV and XLSX data, uploads both, trains with Papermill, promotes, predicts, and rolls back.

OpenRouter calls require a valid key. Without one, known aliases and manual mapping work. The default model is `google/gemma-4-26b-a4b-it:free`; no paid fallback is used. Live provider availability and rate limits depend on OpenRouter.

## Notebook adapter

The registered model is a real `lightgbm.LGBMRegressor` with its preprocessing pipeline. The notebook remains runnable as the standalone Kaggle analysis when `dataset_path` is empty; the API supplies a standardized dataset path and artifact output parameters. Add another model family through a separate adapter with its own feature and target contract, fixed notebook path, artifact manifest validation, and prediction output type. Quantile results must come from a model trained to predict quantiles.

## Current limits

This MVP uses a single film revenue adapter. Its metrics are holdout MAE and RMSE; no business threshold is configured for promotion. Uploaded data and fitted artifacts must be treated as trusted within this internal service boundary. Use a strong service token and restrict network access to the API.
