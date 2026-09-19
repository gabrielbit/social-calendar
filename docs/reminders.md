# Phase 2 reminders — email + web push first

## Triggers
- RSVP going: N days before occurrence
- Same day, hours before
- Ticket pending reminder (skip if ticket_status = comprada or no_aplica)
- Optional grouped birthday alerts for network

## Implementation notes
- Prefer email + Web Push; WhatsApp Utility templates are paid per message (optional later)
- Enqueue via outbox_jobs from worker cron
- Idempotent keys: `{occurrenceId}:{userId}:{reminderKind}`

Scaffold only in Phase 1; worker already has `send_reminder_email` stub handler.
