from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from pydantic import BaseModel, Field

from ..providers import Provider, get_chat_model, supports_images
from ..media import resolve_image_urls
from ..tools import web_search_tools
from . import Skill, register_skill

DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires"
TZ = ZoneInfo(DEFAULT_TIMEZONE)


class EventDraftModel(BaseModel):
    title: str | None = None
    descriptionHtml: str | None = None
    startsAt: str | None = None
    endsAt: str | None = None
    allDay: bool = False
    timezone: str = DEFAULT_TIMEZONE
    locationMode: str = "physical"
    locationLabel: str | None = None
    onlineUrl: str | None = None
    siteUrl: str | None = None
    ticketsUrl: str | None = None
    isFree: bool = False
    priceLabel: str | None = None
    coverImageUrl: str | None = None
    galleryUrls: list[str] = Field(default_factory=list)
    tagSlugs: list[str] = Field(default_factory=list)
    message: str = ""


CREATE_EVENT_PROMPT = """
<agent>
  <role>Extraés un borrador de evento a partir de texto y, si hay, imágenes de flyers.</role>
  <rules>
    <rule>Timezone por defecto: America/Argentina/Buenos_Aires. Fechas en ISO-8601 con offset.</rule>
    <rule>No inventes precio, URLs, lugar ni horario. Si no está en el input, dejalo null.</rule>
    <rule>Si falta un dato público verificable (dirección, link de entradas) y el usuario lo pide o el flyer lo sugiere, usá web_search antes de armar el borrador.</rule>
    <rule>Si falta título o startsAt, pedilos en message y no completes el borrador como listo.</rule>
    <rule>Si hay startsAt y no endsAt, proponé startsAt + 2 horas.</rule>
    <rule>descriptionHtml puede ser HTML simple (p, br, strong). Si solo hay texto plano, envolvél o en &lt;p&gt;.</rule>
    <rule>tagSlugs en minúsculas con guiones, solo si se deducen con claridad.</rule>
  </rules>
</agent>
""".strip()


def _slugify(value: str) -> str:
    import unicodedata

    normalized = unicodedata.normalize("NFD", value)
    ascii_text = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:64]


def _parse_json_content(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _ensure_ends(starts_at: str | None, ends_at: str | None) -> str | None:
    if not starts_at:
        return ends_at
    if ends_at:
        return ends_at
    start = datetime.fromisoformat(starts_at)
    return (start + timedelta(hours=2)).isoformat()


def _normalize_draft(
    data: EventDraftModel,
    image_urls: list[str],
) -> dict[str, Any] | None:
    if not data.title or not data.startsAt:
        return None

    ends_at = _ensure_ends(data.startsAt, data.endsAt)
    if not ends_at:
        return None

    cover = data.coverImageUrl or (image_urls[0] if image_urls else None)
    gallery = data.galleryUrls or image_urls[1:12]

    tags: list[str] = []
    for tag in data.tagSlugs:
        slug = _slugify(tag)
        if slug and slug not in tags:
            tags.append(slug)

    return {
        "title": data.title.strip()[:200],
        "descriptionHtml": data.descriptionHtml,
        "startsAt": data.startsAt,
        "endsAt": ends_at,
        "allDay": data.allDay,
        "timezone": data.timezone or DEFAULT_TIMEZONE,
        "locationMode": data.locationMode if data.locationMode in ("physical", "online", "hybrid") else "physical",
        "locationLabel": data.locationLabel,
        "onlineUrl": data.onlineUrl,
        "siteUrl": data.siteUrl,
        "ticketsUrl": data.ticketsUrl,
        "isFree": data.isFree,
        "priceLabel": data.priceLabel,
        "coverImageUrl": cover,
        "galleryUrls": gallery[:12],
        "tagSlugs": tags[:20],
    }


def _build_user_content(
    text: str,
    image_urls: list[str],
    model_image_urls: list[str],
    provider: Provider,
) -> list[dict[str, Any]] | str:
    now_local = datetime.now(TZ).isoformat()
    base = (
        f"Ahora local ({DEFAULT_TIMEZONE}): {now_local}\n"
        f"Texto del usuario:\n{text or '(sin texto)'}\n"
        f"Imágenes adjuntas ({len(image_urls)}): {', '.join(image_urls) if image_urls else 'ninguna'}\n"
        "Cuando termines de investigar (si hace falta), respondé el borrador."
    )

    if not model_image_urls or not supports_images(provider):
        return base

    parts: list[dict[str, Any]] = [{"type": "text", "text": base}]
    for url in model_image_urls:
        parts.append({"type": "image_url", "image_url": {"url": url}})
    return parts


async def _gather_context(
    *,
    text: str,
    image_urls: list[str],
    provider: Provider,
    history: list[dict[str, Any]] | None,
) -> list[Any]:
    tools = web_search_tools()
    model = get_chat_model(provider)
    bound = model.bind_tools(tools) if tools else model
    model_image_urls = await resolve_image_urls(image_urls) if supports_images(provider) else []
    user_content = _build_user_content(text, image_urls, model_image_urls, provider)

    messages: list[Any] = [SystemMessage(content=CREATE_EVENT_PROMPT)]
    for item in (history or [])[-8:]:
        role = item.get("role")
        content = item.get("content")
        if role == "user" and isinstance(content, str):
            messages.append(HumanMessage(content=content))
        elif role == "assistant" and isinstance(content, str):
            messages.append(AIMessage(content=content))
    messages.append(HumanMessage(content=user_content))

    if not tools:
        return messages

    tool_by_name = {t.name: t for t in tools}
    for _ in range(3):
        response = await bound.ainvoke(messages)
        messages.append(response)
        if not isinstance(response, AIMessage) or not response.tool_calls:
            break
        for call in response.tool_calls:
            name = call.get("name") if isinstance(call, dict) else getattr(call, "name", None)
            args = call.get("args") if isinstance(call, dict) else getattr(call, "args", {})
            call_id = call.get("id") if isinstance(call, dict) else getattr(call, "id", "")
            tool = tool_by_name.get(str(name))
            result = await tool.ainvoke(args or {}) if tool else f"Tool {name} no disponible"
            messages.append(ToolMessage(content=str(result), tool_call_id=str(call_id)))
    return messages


async def run_create_event(
    *,
    text: str,
    image_urls: list[str],
    provider: Provider,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if image_urls and not supports_images(provider):
        return {
            "skillId": "create_event",
            "message": (
                "El modelo DeepSeek no lee imágenes. Cambiá el proveedor a OpenAI o Claude "
                "en Ajustes, o pegá el texto del flyer."
            ),
            "draft": None,
        }

    context_messages = await _gather_context(
        text=text,
        image_urls=image_urls,
        provider=provider,
        history=history,
    )
    context_messages.append(
        HumanMessage(
            content=(
                "Con todo lo anterior, respondé SOLO un JSON con las claves del borrador "
                "más `message` (sin markdown)."
            )
        )
    )

    model = get_chat_model(provider)
    try:
        structured = model.with_structured_output(EventDraftModel)
        result = await structured.ainvoke(context_messages)
        data = result if isinstance(result, EventDraftModel) else EventDraftModel.model_validate(result)
    except Exception:
        raw = await model.ainvoke(context_messages)
        content = raw.content if isinstance(raw.content, str) else str(raw.content)
        data = EventDraftModel.model_validate(_parse_json_content(content))

    draft = _normalize_draft(data, image_urls)
    message = data.message.strip()
    if draft and not message:
        message = "Armé este borrador. Revisalo y tocá Crear evento cuando esté bien."
    if not draft and not message:
        message = "Necesito al menos el título y la fecha/hora de inicio."

    return {
        "skillId": "create_event",
        "message": message,
        "draft": draft,
    }


register_skill(
    Skill(
        id="create_event",
        description="Crear un evento a partir de texto pegado o imágenes de flyers.",
        run=run_create_event,
    )
)
