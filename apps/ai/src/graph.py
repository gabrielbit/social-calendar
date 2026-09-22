from __future__ import annotations

from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from .providers import Provider, ProviderUnavailableError, get_chat_model
from .skills import get_skill, list_skills
from .skills import create_event as _create_event  # noqa: F401 — register skill
from .skills import web_lookup as _web_lookup  # noqa: F401 — register skill


class AgentState(TypedDict, total=False):
    text: str
    image_urls: list[str]
    provider: Provider
    history: list[dict[str, Any]]
    skill_id: str
    message: str
    draft: dict[str, Any] | None


class RouteDecision(BaseModel):
    skill_id: str = Field(description="Id de skill registrada, o 'chat' si ninguna aplica")


ROUTER_PROMPT = """
<agent>
  <role>Elegís qué skill usar según el mensaje del usuario.</role>
  <rules>
    <rule>Respondé solo con un skill_id de la lista, o "chat" si ninguna aplica.</rule>
    <rule>Si el usuario pega un flyer, texto de evento, o pide crear/agendar algo, usá create_event.</rule>
    <rule>Si pide buscar en internet, verificar un dato, o preguntar por un venue/link público, usá web_lookup.</rule>
  </rules>
</agent>
""".strip()


def _skills_catalog() -> str:
    lines = [f"- {skill.id}: {skill.description}" for skill in list_skills()]
    return "\n".join(lines) if lines else "(sin skills)"


async def route_node(state: AgentState) -> AgentState:
    provider: Provider = state.get("provider") or "openai"
    text = (state.get("text") or "").strip()
    image_urls = state.get("image_urls") or []

    lowered = text.lower()
    create_hints = ("crear", "creá", "crea", "alta", "agend", "evento", "flyer", "peg")
    search_hints = ("busc", "google", "internet", "averigu", "dónde queda", "donde queda", "link de")

    if image_urls or any(hint in lowered for hint in create_hints) or len(text) > 80:
        return {**state, "skill_id": "create_event"}
    if any(hint in lowered for hint in search_hints) and get_skill("web_lookup"):
        return {**state, "skill_id": "web_lookup"}

    model = get_chat_model(provider)
    structured = model.with_structured_output(RouteDecision)
    decision = await structured.ainvoke(
        [
            SystemMessage(content=ROUTER_PROMPT),
            HumanMessage(
                content=(
                    f"Skills disponibles:\n{_skills_catalog()}\n\n"
                    f"Mensaje:\n{text or '(vacío)'}\n"
                    f"Imágenes: {len(image_urls)}"
                )
            ),
        ]
    )
    skill_id = decision.skill_id if isinstance(decision, RouteDecision) else "chat"
    if skill_id != "chat" and get_skill(skill_id) is None:
        skill_id = "chat"
    return {**state, "skill_id": skill_id}


async def run_skill_node(state: AgentState) -> AgentState:
    skill_id = state.get("skill_id") or "chat"
    if skill_id == "chat":
        lookup = get_skill("web_lookup")
        if lookup and (state.get("text") or "").strip():
            result = await lookup.run(
                text=state.get("text") or "",
                image_urls=state.get("image_urls") or [],
                provider=state.get("provider") or "openai",
                history=state.get("history") or [],
            )
            return {
                **state,
                "message": result.get("message") or "",
                "draft": None,
                "skill_id": "web_lookup",
            }
        return {
            **state,
            "message": (
                "Puedo crear eventos pegando texto o imágenes, y buscar datos públicos en internet. "
                "Decime qué necesitás."
            ),
            "draft": None,
        }

    skill = get_skill(skill_id)
    if skill is None:
        return {
            **state,
            "message": "No encontré una habilidad para eso.",
            "draft": None,
        }

    result = await skill.run(
        text=state.get("text") or "",
        image_urls=state.get("image_urls") or [],
        provider=state.get("provider") or "openai",
        history=state.get("history") or [],
    )
    return {
        **state,
        "message": result.get("message") or "",
        "draft": result.get("draft"),
        "skill_id": result.get("skillId") or skill_id,
    }


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("route", route_node)
    graph.add_node("run_skill", run_skill_node)
    graph.add_edge(START, "route")
    graph.add_edge("route", "run_skill")
    graph.add_edge("run_skill", END)
    return graph.compile()


_GRAPH = None


def get_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_graph()
    return _GRAPH


async def run_agent_turn(
    *,
    text: str,
    image_urls: list[str],
    provider: Provider,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    graph = get_graph()
    try:
        result = await graph.ainvoke(
            {
                "text": text,
                "image_urls": image_urls,
                "provider": provider,
                "history": history or [],
            }
        )
    except ProviderUnavailableError as exc:
        return {
            "skillId": "chat",
            "message": (
                f"El proveedor {exc.provider} no está configurado en el servidor. "
                "Elegí otro modelo en Ajustes o pedí que carguen la API key."
            ),
            "draft": None,
        }
    except Exception as exc:  # noqa: BLE001 — surface a usable message to the panel
        detail = str(exc)
        if "invalid_image_url" in detail or "downloading file" in detail.lower():
            return {
                "skillId": "create_event",
                "message": (
                    "No pude leer la imagen del flyer. Probá pegar el texto del flyer "
                    "o subir la imagen de nuevo."
                ),
                "draft": None,
            }
        return {
            "skillId": "chat",
            "message": f"Falló el asistente: {detail[:280]}",
            "draft": None,
        }

    return {
        "skillId": result.get("skill_id") or "chat",
        "message": result.get("message") or "",
        "draft": result.get("draft"),
    }
