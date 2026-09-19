# ADR 004: Canonical SEO por ocurrencia

## Estado
Aceptado

## Contexto
Google Event rich results requieren una URL única enfocada en un solo evento. Las URLs contextuales por agenda duplicarían contenido.

## Decisión
- Canónica: `/e/[occurrenceId]` (agenda del autor original).
- Contextual: `/a/[agendaSlug]/e/[occurrenceId]` para compartir; declara `rel=canonical` a la canónica.
- JSON-LD solo en la canónica. Online-only no fuerza rich result engañoso.
- Cumpleaños fuera de sitemap y JSON-LD.

## Consecuencias
- Sitemap lista ocurrencias canónicas vigentes.
- OG dinámico en contextual y canónica.
