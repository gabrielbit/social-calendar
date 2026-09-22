from __future__ import annotations

import base64
from urllib.parse import urlparse

import httpx

_PRIVATE_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}


def _is_private_url(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return False
    return host in _PRIVATE_HOSTS or host.endswith(".local")


async def image_url_for_model(url: str) -> str:
    """OpenAI/Claude no pueden bajar URLs de localhost: convertimos a data URL."""
    if url.startswith("data:"):
        return url
    if not _is_private_url(url):
        return url

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        if not content_type.startswith("image/"):
            content_type = "image/jpeg"
        encoded = base64.b64encode(response.content).decode("ascii")
        return f"data:{content_type};base64,{encoded}"


async def resolve_image_urls(urls: list[str]) -> list[str]:
    resolved: list[str] = []
    for url in urls[:6]:
        try:
            resolved.append(await image_url_for_model(url))
        except Exception:
            # Si no se puede leer localmente, omitimos esa imagen.
            continue
    return resolved
