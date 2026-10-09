# Northstar Laravel workbench

This Laravel 12 / Inertia React app connects to the FastAPI ML service in `../api`. The movie dashboard (`/dashboard`) is the prediction, AI chat, generated dashboard, and saved snapshot experience. The production workbench (`/workbench`, with dataset onboarding at `/upload`) separately manages production plans, dataset references, training jobs, and model promotion. Laravel stores user-owned references and dashboard snapshots; the ML service owns datasets, mappings, model artifacts, analytics, and predictions.

The dashboard reads the active model's feature contract before enabling predictions, sends budgets in USD, and displays model version and declared currency. Chat and dashboard requests proxy through Laravel with the service token; the browser never receives that credential. Dashboard drafts are checked against the verified result IDs and fields returned by FastAPI. Saving stores those validated results with dataset/model provenance so reopening a dashboard renders the same snapshot.

## Docker deployment

The shared Compose stack builds and runs Laravel, FastAPI, PostgreSQL, Redis, and the ML worker. From the repository root, prepare both environment files:

```powershell
Copy-Item api/.env.example api/.env
Copy-Item web/.env.example web/.env
```

Set a strong `SERVICE_TOKEN` in `api/.env`. Build the Laravel image and generate an application key:

```powershell
Set-Location api
docker compose build
docker compose run --rm --no-deps --entrypoint php web artisan key:generate --show
```

Copy the generated `base64:...` value into `APP_KEY` in `web/.env`, set `APP_URL` there to the public site URL, then start the stack:

```powershell
docker compose up -d
```

Open `http://localhost:8080`. Compose passes the API container's service token to Laravel and connects it to FastAPI over the private Compose network. Laravel uses a persistent SQLite volume and storage volume; migrations run at container startup. Set `LARAVEL_PORT` in `api/.env` to change the host port. For a TLS deployment, put a reverse proxy in front and set the public `APP_URL` in `web/.env`.

Useful commands from `api/`:

```powershell
docker compose logs -f web
docker compose exec web php artisan migrate:status
docker compose build web
docker compose --profile test run --build --rm web-test
```

The deployed image serves the production Vite build with Apache and PHP 8.3. It does not mount the source tree, so rebuilding is required after code changes.

## Local setup

1. Start FastAPI and its worker from `../api` using its README.
2. Run `composer install` and `npm ci` in this directory.
3. Copy `.env.example` to `.env`, run `php artisan key:generate`, and set `ML_API_SERVICE_TOKEN` to the `SERVICE_TOKEN` in `../api/.env`. Set `ML_API_URL` if FastAPI is not at `http://127.0.0.1:8000`.
4. Create `database/database.sqlite`, run `php artisan migrate`, then run `php artisan serve` and `npm run dev`.
5. Register or sign in. The `/dashboard` page uses an already-active movie model for predictions and AI analysis. For historical analytics, use `/workbench` to upload a CSV/XLSX dataset, approve its mapping, and validate it. Dashboard generation is enabled only for validated datasets. Training and model promotion stay in the production workbench.

The Docker entrypoint sets PHP `upload_max_filesize` to `ML_API_MAX_UPLOAD_MB` and leaves multipart overhead in `post_max_size`. Compose keeps this aligned with FastAPI's `MAX_UPLOAD_MB` setting.

The active LightGBM model currently predicts **point revenue**. The UI reports the model version and only shows a currency if the model provides one. Audience forecasts, quantiles, risk scores, and production disruption simulation are not available in the current API. Promotions and rollbacks change the globally active model for all users.

Run `php artisan test` and `npm run build` to verify the app. If the PHP CLI has SQLite extensions installed but disabled, enable `pdo_sqlite` and `sqlite3` in `php.ini` first, or run tests directly with `php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit`.
