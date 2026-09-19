"""Scaffold LangGraph agent service — implement in Phase 3."""

from __future__ import annotations

# Planned entrypoints:
# - global_explore_agent(query: str) -> SearchQuery + mode
# - promoter_agent(promoter_id: str, message: str) -> answer grounded on their events

def health() -> dict[str, str]:
    return {"status": "scaffold", "phase": "3"}
