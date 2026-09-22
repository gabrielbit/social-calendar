from __future__ import annotations

import httpx
from langchain_core.tools import tool

from ..config import get_settings, tavily_available


def tavily_search(query: str, *, max_results: int = 5) -> str:
    """Busca en internet con Tavily. Devuelve texto compacto para el modelo."""
    settings = get_settings()
    if not settings.tavily_api_key:
        return "Tavily no está configurado (falta TAVILY_API_KEY)."

    q = query.strip()
    if not q:
        return "Query vacía."

    try:
        response = httpx.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": q,
                "search_depth": "basic",
                "include_answer": True,
                "max_results": max_results,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:  # noqa: BLE001 — surface to the model
        return f"Error buscando en internet: {exc}"

    parts: list[str] = []
    answer = data.get("answer")
    if isinstance(answer, str) and answer.strip():
        parts.append(f"Resumen: {answer.strip()}")

    for item in data.get("results") or []:
        title = str(item.get("title") or "").strip()
        url = str(item.get("url") or "").strip()
        content = str(item.get("content") or "").strip()
        line = " · ".join(x for x in (title, url) if x)
        if content:
            line = f"{line}\n{content[:400]}"
        if line:
            parts.append(line)

    return "\n\n".join(parts) if parts else "Sin resultados."


@tool("web_search")
def web_search(query: str) -> str:
    """Busca en internet datos públicos: venues, horarios, entradas, links de eventos o contexto.

    Usá esta tool cuando falte información verificable (dirección, URL de tickets, fecha pública)
    o cuando el usuario pida buscar algo. No inventes: si no aparece, decilo.
    """
    return tavily_search(query)


def web_search_tools():
    if not tavily_available():
        return []
    return [web_search]
