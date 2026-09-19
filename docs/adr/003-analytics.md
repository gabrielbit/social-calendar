# ADR 003: Analítica append-only

## Estado
Aceptado

## Contexto
Vistas, clics a entradas, compartidos y RSVP no se reconstruyen en retrospectiva.

## Decisión
Tabla `activity_events` append-only desde el día 1. Agregados por período en jobs. Sin PII innecesaria: IDs, tipo, timestamp, metadata mínima.

## Consecuencias
- Escritura fire-and-forget desde web/API.
- Retención y agregación periódica para controlar volumen.
