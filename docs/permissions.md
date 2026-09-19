# Matriz de permisos

| Recurso | Anónimo | Autenticado | Owner | Service role |
|---------|---------|-------------|-------|--------------|
| Perfil público | leer | leer | escribir | todo |
| birthday_year | — | — (columna revocada) | vía API owner | sí |
| Agenda pública | leer | leer | escribir | todo |
| Evento private | — | — | leer/escribir | sí |
| Evento shared | leer | leer | escribir | sí |
| Evento public | leer + incorporar | leer + incorporar | escribir | sí |
| Ocurrencia | según evento | según evento | escribir | sí |
| RSVP propio | — | escribir | — | sí |
| RSVP ajeno visible | leer si profile_visible | leer si visible | — | sí |
| Preferencias / zona hogar | — | solo propias | — | sí |
| calendar_connections | — | solo propias | — | sí |
| outbox_jobs | — | — | — | sí |
| reports | — | crear | leer propias | moderar |

Visibilidad efectiva y composición de agendas viven en SQL (`agenda_occurrences`, `private.can_view_event`).
