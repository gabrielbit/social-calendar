import Link from "next/link";
import type { AgendaSourceItem } from "@/lib/events";

type AgendaSourcesProps = {
  sources: AgendaSourceItem[];
};

export function AgendaSources({ sources }: AgendaSourcesProps) {
  if (sources.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-[11px] font-medium uppercase text-ink-faint">Fuentes de esta agenda</h2>
      <ul className="mt-3 space-y-2.5">
        {sources.map((source) => (
          <li key={source.slug} className="flex items-baseline justify-between gap-3 text-sm">
            {source.own ? (
              <span className="text-ink">{source.name}</span>
            ) : (
              <Link href={`/a/${source.slug}`} className="min-w-0 truncate text-ink hover:text-white">
                @{source.slug}
              </Link>
            )}
            <span className="shrink-0 tabular-nums text-ink-faint">{source.count}</span>
          </li>
        ))}
      </ul>
      {sources.some((s) => !s.own) ? (
        <p className="mt-3 text-pretty text-xs text-ink-faint">
          Los eventos curados mantienen crédito al autor original.
        </p>
      ) : null}
    </section>
  );
}