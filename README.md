# Agenda Comunidad

Agenda pública composable para promotores, artistas y organizadores. Cada perfil publica eventos propios y puede curar eventos de otras agendas manteniendo la atribución al autor original.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js App Router (Vercel) — lecturas públicas con RLS |
| API escrituras | Fastify + TypeScript (Railway) |
| Worker / cron | Node + TypeScript (Railway) |
| Base de datos | Supabase (Postgres + PostGIS + RLS) |
| Dominio compartido | `packages/domain` (Zod, recurrencia, ingest) |

## Estructura

```
agenda-comunidad/
  apps/web/          # Next.js
  apps/api/          # Fastify REST
  apps/worker/       # Outbox + cron
  packages/domain/   # Lógica compartida
  supabase/          # Migraciones y config local
  docs/              # ADRs y contratos
```

## Requisitos

- Node.js ≥ 20
- pnpm 9
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Desarrollo local

### 1. Base de datos

```bash
supabase start
```

Anotá `API URL`, `anon key` y `service_role key` del output.

### 2. Dependencias

```bash
pnpm install
```

### 3. Variables de entorno

Copiá `.env.example` a `.env` en la raíz y completá las claves. Cada app tiene su `.env.example` con variables específicas.

Generá una clave de cifrado para tokens OAuth (32 bytes hex):

```bash
openssl rand -hex 32
```

### 4. Servicios

En terminales separadas:

```bash
pnpm dev:web      # http://localhost:3000
pnpm dev:api      # http://localhost:3001
pnpm dev:worker   # loop outbox cada 15s
```

Modo cron (un pase y salir, útil en Railway):

```bash
pnpm --filter @agenda/worker start -- --once
```

### 5. Tests y typecheck

```bash
pnpm typecheck
pnpm test:unit    # domain + api + worker
```

## Variables de entorno

| Variable | App | Descripción |
|----------|-----|-------------|
| `SUPABASE_URL` | todas | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | web | Clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | api, worker | Clave service role (solo backend) |
| `TOKEN_ENCRYPTION_KEY` | api, worker | AES-256-GCM, 64 chars hex |
| `NEXT_PUBLIC_*` | web | URLs y anon key expuestas al cliente |
| `API_PORT` | api | Puerto Fastify (default 3001) |
| `WORKER_POLL_INTERVAL_MS` | worker | Intervalo del loop (default 15000) |
| `WORKER_BATCH_SIZE` | worker | Jobs por pase (default 10) |

## Worker (`@agenda/worker`)

Procesa la tabla `outbox_jobs`:

- **`regenerate_occurrences`** — borra ocurrencias futuras no-excepción y las regenera con `expandRrule` (horizonte 365 días)
- **`google_sync_create|update|delete`** — stub de sync Google Calendar (tokens cifrados AES-256-GCM)
- **`send_reminder_email`** — stub que loguea el envío
- **`birthday_reminders_scan`** — consulta cumpleaños de la red y encola recordatorios agrupados

Despliegue Railway: ver `apps/worker/railway.toml`. Para cron, programar `node dist/index.js --once`.

## Fases del producto

Ver `SPEC.md` para el detalle completo.

| Fase | Alcance |
|------|---------|
| **1A** | Auth, perfiles, eventos, ocurrencias, tags, import ICS |
| **1B** | Agenda composable, explorar básico, RSVP, sync Google, SEO |
| **2** | Explorar adaptativo, recordatorios email/push, constelación home |
| **3** | pgvector, agentes LangGraph, asistente AI para promotores |

## Documentación

- [SPEC.md](./SPEC.md) — visión y features
- [docs/adr/](./docs/adr/) — decisiones de arquitectura
- [docs/contracts/api.md](./docs/contracts/api.md) — contrato REST

## CI

GitHub Actions (`.github/workflows/ci.yml`): en push/PR instala pnpm, corre typecheck y tests de `@agenda/domain`, `@agenda/api` y `@agenda/worker`.
