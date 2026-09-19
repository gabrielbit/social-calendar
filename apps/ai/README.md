# Fase 3 — Agentes AI (scaffolding)

## Objetivo
Agente global gratuito para consultas del tipo “qué hay hoy en CABA para bailar” y agentes por promotor (pago) acotados a sus eventos.

## Stack previsto
- `apps/ai` (Python): LangGraph
- Supabase `pgvector` ya habilitado en migración inicial
- Embeddings solo de ocurrencias/perfiles publicados y autorizados
- Búsqueda híbrida: filtros SQL/PostGIS primero, ranking semántico después

## Contrato con Explorar
El agente traduce lenguaje natural al mismo `SearchQuery` de `@agenda/domain` y sugiere `mode` (`feed|carousel|sections`). Los chips quedan visibles y editables.

## Seguridad
- No usar vectores para “hoy” o “cerca”
- Prompt injection: tools solo leen datos públicos/autorizados
- birthday_year nunca entra al contexto del agente
- Rate limits y entitlements de planes pagos

## Estado
Scaffolding documentado; implementación post-MVP.
