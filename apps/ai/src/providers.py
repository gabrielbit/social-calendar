from __future__ import annotations

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI

from .config import Provider, get_settings, provider_available


class ProviderUnavailableError(RuntimeError):
    def __init__(self, provider: Provider):
        super().__init__(f"Provider {provider} is not configured")
        self.provider = provider


def get_chat_model(provider: Provider) -> BaseChatModel:
    settings = get_settings()
    if not provider_available(provider):
        raise ProviderUnavailableError(provider)

    if provider == "openai":
        return ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            temperature=0.2,
        )

    if provider == "anthropic":
        return ChatAnthropic(
            api_key=settings.anthropic_api_key,
            model=settings.anthropic_model,
            temperature=0.2,
        )

    return ChatOpenAI(
        api_key=settings.deepseek_api_key,
        model=settings.deepseek_model,
        base_url=settings.deepseek_base_url,
        temperature=0.2,
    )


def supports_images(provider: Provider) -> bool:
    return provider in ("openai", "anthropic")
