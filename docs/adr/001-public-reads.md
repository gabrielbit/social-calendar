# ADR 001: Lecturas públicas directas desde Next.js

## Estado
Aceptado

## Contexto
Las páginas públicas (agendas, eventos, explorar) necesitan baja latencia y SEO. Pasar todo por Fastify en Railway añadiría un hop y riesgo de duplicar reglas de visibilidad.

## Decisión
Next.js (Server Components) lee Postgres/Supabase directamente con el cliente anon/authenticated respetando RLS. Fastify en Railway queda para escrituras, OAuth, worker jobs e integraciones.

## Consecuencias
- La visibilidad efectiva debe vivir en SQL (vistas/funciones con `security_invoker`).
- El web no reimplementa reglas de composición.
- Escrituras siempre van a la API para validar, sanitizar y encolar side-effects.
