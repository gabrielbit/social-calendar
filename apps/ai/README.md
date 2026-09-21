# Fase 3 — Agente de promotor (LangGraph)

## Qué hace hoy
Asistente por licencia: convierte texto e imágenes pegadas en un borrador de evento.
El router elige skills registradas; hoy solo existe `create_event`.

## Stack
- FastAPI + LangGraph
- Proveedores: OpenAI, Anthropic, DeepSeek (vía API compatible OpenAI)

## Arranque local
```bash
pnpm dev:ai
# o
cd apps/ai && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

Requiere `AI_INTERNAL_TOKEN` y al menos una API key de proveedor en el `.env` raíz.

## Contrato
`POST /v1/turns` con header `Authorization: Bearer $AI_INTERNAL_TOKEN`.
Body: `{ userId, provider, text, imageUrls, history }`.
Respuesta: `{ skillId, message, draft }`.

## Seguridad
- Solo Fastify llama a este servicio (token interno).
- El agente no escribe en la base; la creación del evento la confirma el usuario en el panel.
