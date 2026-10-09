from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://survive:survive@postgres:5432/survive"
    redis_url: str = "redis://redis:6379/0"
    storage_root: Path = Path("/data")
    service_token: str = ""
    cors_origins: str = ""
    max_upload_mb: int = 20
    profile_rows: int = 10000
    ai_provider: str = "openrouter"
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "google/gemma-4-26b-a4b-it:free"
    openrouter_timeout_seconds: int = 45
    openrouter_max_retries: int = 2
    openrouter_json_mode: bool = True


@lru_cache
def settings() -> Settings:
    return Settings()
