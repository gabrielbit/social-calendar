# Agenda Comunidad

## Problema
Dar a promotores, artistas y organizadores una agenda pública propia que también pueda curar eventos reutilizables de otras agendas sin perder autoría.

## Usuarios
- Visitantes anónimos que descubren eventos y perfiles.
- Usuarios registrados (todos nacen como promotores).
- Promotores pagos con asistente AI (fase posterior).

## Flujo principal
1. El promotor se registra, crea su perfil y publica o importa eventos.
2. Otros promotores siguen agendas, incorporan eventos públicos y los atribuyen al autor original.
3. Visitantes exploran por fecha/tag/zona, marcan “Voy” y opcionalmente sincronizan con Google Calendar.

## Features MVP (Fase 1A + 1B)
- [ ] Auth (magic link + Google) y onboarding de perfil
- [ ] Cumpleaños en perfil (día/mes, solo seguidores)
- [ ] Eventos con ocurrencias, recurrencia, tags e imágenes
- [ ] Importación ICS y creación asistida desde flyer
- [ ] Agenda pública composable (fuentes + pines) con atribución
- [ ] Explorar mínimo (fecha, tag, zona)
- [ ] Canonical, JSON-LD, sitemap, Open Graph, WhatsApp share
- [ ] Mi agenda (Siguiendo / Voy) + RSVP + estado de entrada
- [ ] Sync opcional Google Calendar (calendario secundario)
- [ ] Moderación básica y analítica append-only

## Features post-MVP
- Explorar adaptativo (feed / carrusel / secciones)
- Constelación home, recordatorios email/push
- pgvector + agentes LangGraph

## Stack decidido
- Frontend: Next.js App Router (Vercel) — lecturas públicas directas a Postgres con RLS
- Backend escrituras: Fastify (Railway)
- Worker/cron: Node (Railway)
- DB/Auth/Storage: Supabase (Postgres + PostGIS + RLS)
- Dominio compartido: `packages/domain` (Zod schemas)

## Estructura de carpetas
```
agenda-comunidad/
  SPEC.md
  docs/adr/
  apps/web/
  apps/api/
  apps/worker/
  packages/domain/
  supabase/migrations/
  .github/workflows/
```

## Decisiones de arquitectura
Ver `docs/adr/`.
