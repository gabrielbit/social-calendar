from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from dotenv import dotenv_values
from pydantic_settings import BaseSettings, SettingsConfigDict


def _load_env_files() -> None:
    """Carga .env del monorepo. Valores vacíos no pisan claves ya seteadas con contenido."""
    import os

    here = Path(__file__).resolve().parent
    candidates = (
        here.parents[2] / ".env",  # social-calendar/.env
        here.parents[2] / "apps" / "api" / ".env",
        here.parents[1] / ".env",  # apps/ai/.env
        Path.cwd() / ".env",
    )
    for path in candidates:
        if not path.exists():
            continue
        for key, value in dotenv_values(path).items():
            if key is None or value is None:
                continue
            current = os.environ.get(key)
            if current is None or current.strip() == "":
                os.environ[key] = value


_load_env_files()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    ai_internal_token: str = "dev-ai-token"
    host: str = "0.0.0.0"
    port: int = 8000

    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-5"

    deepseek_api_key: str | None = None
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com"

    tavily_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


Provider = Literal["openai", "anthropic", "deepseek"]


def provider_available(provider: Provider) -> bool:
    settings = get_settings()
    if provider == "openai":
        return bool(settings.openai_api_key)
    if provider == "anthropic":
        return bool(settings.anthropic_api_key)
    return bool(settings.deepseek_api_key)


def tavily_available() -> bool:
    return bool(get_settings().tavily_api_key)
