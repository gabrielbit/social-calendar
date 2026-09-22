from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from ..providers import Provider, get_chat_model
from ..tools import web_search_tools
from . import Skill, register_skill

LOOKUP_PROMPT = """
<agent>
  <role>Respondés preguntas con búsqueda en internet cuando hace falta.</role>
  <rules>
    <rule>Si necesitás datos actuales o públicos, usá web_search.</rule>
    <rule>No inventes links ni fechas. Citá fuentes brevemente cuando puedas.</rule>
    <rule>Respondé en español, corto y claro.</rule>
  </rules>
</agent>
""".strip()


async def _tool_loop(
    *,
    provider: Provider,
    system: str,
    user_content: Any,
    history: list[dict[str, Any]] | None,
    max_rounds: int = 3,
) -> list[Any]:
    tools = web_search_tools()
    model = get_chat_model(provider)
    bound = model.bind_tools(tools) if tools else model

    messages: list[Any] = [SystemMessage(content=system)]
    for item in (history or [])[-6:]:
        role = item.get("role")
        content = item.get("content")
        if role == "user" and isinstance(content, str):
            messages.append(HumanMessage(content=content))
        elif role == "assistant" and isinstance(content, str):
            messages.append(AIMessage(content=content))
    messages.append(HumanMessage(content=user_content))

    tool_by_name = {t.name: t for t in tools}
    for _ in range(max_rounds):
        response = await bound.ainvoke(messages)
        messages.append(response)
        if not isinstance(response, AIMessage) or not response.tool_calls:
            break
        for call in response.tool_calls:
            name = call.get("name") if isinstance(call, dict) else getattr(call, "name", None)
            args = call.get("args") if isinstance(call, dict) else getattr(call, "args", {})
            call_id = call.get("id") if isinstance(call, dict) else getattr(call, "id", "")
            tool = tool_by_name.get(str(name))
            if tool is None:
                result = f"Tool {name} no disponible"
            else:
                result = await tool.ainvoke(args or {})
            messages.append(ToolMessage(content=str(result), tool_call_id=str(call_id)))
    return messages


async def run_web_lookup(
    *,
    text: str,
    image_urls: list[str],
    provider: Provider,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if not web_search_tools():
        return {
            "skillId": "web_lookup",
            "message": "La búsqueda en internet no está configurada (falta TAVILY_API_KEY).",
            "draft": None,
        }

    messages = await _tool_loop(
        provider=provider,
        system=LOOKUP_PROMPT,
        user_content=text or "(sin texto)",
        history=history,
    )
    last = messages[-1]
    content = last.content if isinstance(last, AIMessage) else str(last)
    if isinstance(content, list):
        content = " ".join(
            part.get("text", "") if isinstance(part, dict) else str(part) for part in content
        )
    message = str(content).strip() or "No encontré nada útil."
    return {"skillId": "web_lookup", "message": message, "draft": None}


register_skill(
    Skill(
        id="web_lookup",
        description="Buscar en internet (venues, horarios, entradas, datos públicos).",
        run=run_web_lookup,
    )
)
