from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from ..providers import Provider, get_chat_model, supports_images
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


def _build_user_content(text: str, image_urls: list[str], provider: Provider) -> list[dict[str, Any]] | str:
    now_local = datetime.now(TZ).isoformat()
    base = (
        f"Ahora local ({DEFAULT_TIMEZONE}): {now_local}\n"
        f"Texto del usuario:\n{text or '(sin texto)'}\n"
        f"Imágenes adjuntas ({len(image_urls)}): {', '.join(image_urls) if image_urls else 'ninguna'}\n"
        "Respondé SOLO un JSON con las claves del borrador más `message`."
    )

    if not image_urls or not supports_images(provider):
        return base

    parts: list[dict[str, Any]] = [{"type": "text", "text": base}]
    for url in image_urls[:6]:
        parts.append({"type": "image_url", "image_url": {"url": url}})
    return parts


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

    model = get_chat_model(provider)
    structured = model.with_structured_output(EventDraftModel)

    messages: list[Any] = [SystemMessage(content=CREATE_EVENT_PROMPT)]
    for item in (history or [])[-8:]:
        role = item.get("role")
        content = item.get("content")
        if role == "user" and isinstance(content, str):
            messages.append(HumanMessage(content=content))
        elif role == "assistant" and isinstance(content, str):
            messages.append(SystemMessage(content=f"Asistente previo: {content}"))

    messages.append(HumanMessage(content=_build_user_content(text, image_urls, provider)))

    try:
        result = await structured.ainvoke(messages)
        if isinstance(result, EventDraftModel):
            data = result
        else:
            data = EventDraftModel.model_validate(result)
    except Exception:
        # Fallback: plain JSON completion for providers that struggle with structured output.
        raw_model = get_chat_model(provider)
        raw = await raw_model.ainvoke(messages)
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
