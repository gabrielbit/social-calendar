# ADR 002: Modelo de ocurrencias

## Estado
Aceptado

## Contexto
Eventos recurrentes (yoga semanal, milongas) necesitan RSVP, URL, sync y recordatorios por fecha concreta, no por la serie.

## Decisión
- `events` guarda la definición (incluyendo RRULE).
- `event_occurrences` materializa cada fecha concreta con ID estable dentro de un horizonte móvil (~12 meses), mantenido por cron.
- RSVP, entradas, sync externo, compartir y SEO apuntan a la ocurrencia.
- Excepciones permiten cancelar/mover una fecha sin alterar la serie.

## Consecuencias
- El worker debe regenerar/actualizar ocurrencias al publicar o editar.
- URLs: `/e/[occurrenceId]` canónica; URL contextual por agenda declara canonical.
- 29 de febrero: en años no bisiestos se celebra el 28 de febrero.
