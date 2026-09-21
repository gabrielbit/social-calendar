from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Cargar .env de la raíz del monorepo y de apps/ai
_HERE = Path(__file__).resolve().parent
for candidate in (
    _HERE.parents[2] / ".env",  # social-calendar/.env
    _HERE.parents[1] / ".env",  # apps/ai/.env
    Path.cwd() / ".env",
):
    if candidate.exists():
        load_dotenv(candidate, override=False)


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
