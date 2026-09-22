from __future__ import annotations

from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .config import get_settings, provider_available, tavily_available
from .graph import run_agent_turn

app = FastAPI(title="Agenda AI", version="0.1.0")


class TurnRequest(BaseModel):
    userId: str
    provider: Literal["openai", "anthropic", "deepseek"] = "openai"
    text: str = ""
    imageUrls: list[str] = Field(default_factory=list)
    history: list[dict[str, Any]] = Field(default_factory=list)


class TurnResponse(BaseModel):
    skillId: str
    message: str
    draft: dict[str, Any] | None = None


def verify_internal_token(authorization: str | None = Header(default=None)) -> None:
    settings = get_settings()
    expected = f"Bearer {settings.ai_internal_token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid internal token")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "providers": {
            "openai": provider_available("openai"),
            "anthropic": provider_available("anthropic"),
            "deepseek": provider_available("deepseek"),
        },
        "tools": {
            "tavily": tavily_available(),
        },
    }


@app.post("/v1/turns", response_model=TurnResponse, dependencies=[Depends(verify_internal_token)])
async def turns(body: TurnRequest) -> TurnResponse:
    if not body.text.strip() and not body.imageUrls:
        raise HTTPException(status_code=400, detail="text or imageUrls required")

    result = await run_agent_turn(
        text=body.text,
        image_urls=body.imageUrls[:12],
        provider=body.provider,
        history=body.history,
    )
    return TurnResponse(
        skillId=result["skillId"],
        message=result["message"],
        draft=result.get("draft"),
    )


def main() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )


if __name__ == "__main__":
    main()
