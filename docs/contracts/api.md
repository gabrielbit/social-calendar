# Contrato REST — Agenda Comunidad API

Base URL local: `http://localhost:3001`  
Autenticación: `Authorization: Bearer <supabase_jwt>` (excepto health y lecturas públicas).

Prefijo de negocio: `/api`

## Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio |

## Perfiles y onboarding

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/profiles/onboarding` | Crear perfil + agenda primaria |
| GET | `/api/profiles/me` | Perfil del usuario (incluye año de cumpleaños solo para el dueño) |
| PATCH | `/api/profiles/me` | Actualizar perfil propio |
| GET | `/api/profiles/:slug` | Perfil público (sin `birthday_year`) |

## Eventos y agendas

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/events` | Crear evento + ocurrencias |
| PATCH | `/api/events/:eventId` | Actualizar evento |
| POST | `/api/events/occurrences/:occurrenceId/cancel` | Cancelar una ocurrencia |
| GET | `/api/agendas/:agendaId/occurrences` | Ocurrencias compuestas (`from`, `to`) |

## Comunidad

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/community/follow` | Seguir perfil |
| DELETE | `/api/community/follow/:profileId` | Dejar de seguir |
| POST | `/api/community/sources` | Agregar fuente de agregación |
| POST | `/api/community/pins` | Incluir/excluir evento |
| POST | `/api/community/blocks` | Bloquear agregación |

## RSVP y calendario externo

| Método | Ruta | Descripción |
|--------|------|-------------|
| PUT | `/api/rsvp` | Marcar Voy / No voy + ticket status |
| GET | `/api/calendar/google/connect` | URL OAuth Google Calendar |
| POST | `/api/calendar/google/callback` | Guardar tokens cifrados |
| DELETE | `/api/calendar/google` | Desconectar |

## Ingest (cold start)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ingest/ics` | Parsear ICS → drafts (no publica) |
| POST | `/api/ingest/flyer` | Parsear texto flyer → draft |

## Moderación y actividad

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/reports` | Reportar evento/perfil/ocurrencia |
| POST | `/api/activity` | Registrar evento de analítica |

## Outbox (worker)

- `regenerate_occurrences`
- `google_sync_create|update|delete`
- `send_reminder_email`
- `birthday_reminders_scan`
