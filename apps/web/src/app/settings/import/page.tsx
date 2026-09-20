"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Link2, Sparkles } from "lucide-react";
import { parseIcs, parseFlyerText, type ParsedIcsEvent } from "@agenda/domain";
import { formatEventDate, formatEventTime } from "@/lib/dates";
import { Container } from "@/components/layout/Container";

type IcsDraft = ParsedIcsEvent & { source: "ics" };
type FlyerDraft = ReturnType<typeof parseFlyerText> & { source: "flyer" };
type DraftPreview = IcsDraft | FlyerDraft;

function isIcsDraft(d: DraftPreview): d is IcsDraft {
  return d.source === "ics";
}

export default function ImportPage() {
  const [icsText, setIcsText] = useState("");
  const [icsUrl, setIcsUrl] = useState("");
  const [flyerText, setFlyerText] = useState("");
  const [drafts, setDrafts] = useState<DraftPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleIcsPaste() {
    setError(null);
    try {
      const parsed = parseIcs(icsText);
      setDrafts(parsed.map((e) => ({ ...e, source: "ics" as const })));
      if (parsed.length === 0) setError("No se encontraron eventos en el ICS");
    } catch {
      setError("ICS inválido");
    }
  }

  async function handleIcsUrl() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(icsUrl);
      const text = await res.text();
      const parsed = parseIcs(text);
      setDrafts(parsed.map((e) => ({ ...e, source: "ics" as const })));
      if (parsed.length === 0) setError("No se encontraron eventos en la URL");
    } catch {
      setError("No se pudo cargar la URL");
    } finally {
      setLoading(false);
    }
  }

  function handleFlyer() {
    setError(null);
    if (!flyerText.trim()) {
      setError("Pegá el texto del flyer");
      return;
    }
    const parsed = parseFlyerText(flyerText);
    if (!parsed.title) {
      setError("No se detectó un título en el flyer");
      return;
    }
    setDrafts([{ ...parsed, source: "flyer" }]);
  }

  return (
    <Container className="py-10 sm:py-14">
    <div className="mx-auto max-w-2xl">
      <Link href="/settings" className="text-sm text-ink-muted hover:text-ink">
        ← Ajustes
      </Link>
      <h1 className="page-title mt-4">Importar eventos</h1>
      <p className="mt-1 text-ink-muted">
        Pegá un ICS, una URL de calendario o texto de un flyer para previsualizar borradores.
      </p>

      <section className="card mt-6 space-y-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <FileText className="size-4 text-accent" aria-hidden />
          Pegar ICS
        </h2>
        <textarea
          className="input-field min-h-[120px] font-mono text-xs"
          placeholder="BEGIN:VCALENDAR…"
          value={icsText}
          onChange={(e) => setIcsText(e.target.value)}
        />
        <button type="button" onClick={handleIcsPaste} className="btn-secondary text-sm">
          Analizar ICS
        </button>
      </section>

      <section className="card mt-4 space-y-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Link2 className="size-4 text-accent" aria-hidden />
          URL de calendario
        </h2>
        <input
          type="url"
          className="input-field"
          placeholder="https://…"
          value={icsUrl}
          onChange={(e) => setIcsUrl(e.target.value)}
        />
        <button
          type="button"
          onClick={handleIcsUrl}
          disabled={loading || !icsUrl}
          className="btn-secondary text-sm"
        >
          {loading ? "Cargando…" : "Importar desde URL"}
        </button>
      </section>

      <section className="card mt-4 space-y-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Sparkles className="size-4 text-accent" aria-hidden />
          Texto de flyer
        </h2>
        <textarea
          className="input-field min-h-[100px]"
          placeholder="Nombre del evento, fecha, lugar…"
          value={flyerText}
          onChange={(e) => setFlyerText(e.target.value)}
        />
        <button type="button" onClick={handleFlyer} className="btn-secondary text-sm">
          Generar borrador
        </button>
      </section>

      {error && (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <section className="mt-8" aria-label="Borradores">
          <h2 className="mb-4 text-lg font-semibold text-ink">
            Vista previa ({drafts.length})
          </h2>
          <ul className="space-y-3">
            {drafts.map((d, i) => (
              <li key={i} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{d.title ?? "Sin título"}</p>
                    {isIcsDraft(d) ? (
                      <>
                        <p className="mt-1 text-sm text-ink-muted">
                          {formatEventDate(d.startsAt.toISOString(), undefined, d.allDay)}
                          {!d.allDay &&
                            ` · ${formatEventTime(d.startsAt.toISOString(), d.endsAt.toISOString())}`}
                        </p>
                        {d.location && (
                          <p className="mt-1 text-xs text-ink-faint">{d.location}</p>
                        )}
                      </>
                    ) : (
                      <>
                        {d.startsAtHint && (
                          <p className="mt-1 text-sm text-ink-muted">Fecha: {d.startsAtHint}</p>
                        )}
                        {d.locationHint && (
                          <p className="mt-1 text-xs text-ink-faint">{d.locationHint}</p>
                        )}
                        {d.tagHints.length > 0 && (
                          <p className="mt-1 text-xs text-ink-faint">
                            Tags: {d.tagHints.join(", ")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted">
                    {d.source === "ics" ? "ICS" : "Flyer"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-ink-faint">
                  Publicación final vía API (próximo paso).
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
    </Container>
  );
}
