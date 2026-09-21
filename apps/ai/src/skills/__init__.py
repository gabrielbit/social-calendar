from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Awaitable, Callable


@dataclass(frozen=True)
class Skill:
    id: str
    description: str
    run: Callable[..., Awaitable[dict[str, Any]]]


_REGISTRY: dict[str, Skill] = {}


def register_skill(skill: Skill) -> Skill:
    _REGISTRY[skill.id] = skill
    return skill


def list_skills() -> list[Skill]:
    return list(_REGISTRY.values())


def get_skill(skill_id: str) -> Skill | None:
    return _REGISTRY.get(skill_id)
