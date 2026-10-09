# API workspace

- Keep all application changes inside this `api` directory.
- Run `pytest` for unit checks and `python scripts/e2e_demo.py` with Compose for integration checks.
- Never commit `.env`, uploaded datasets, or model artifacts.
- Do not execute notebook paths supplied by API callers; only the predefined adapter notebook is allowed.
