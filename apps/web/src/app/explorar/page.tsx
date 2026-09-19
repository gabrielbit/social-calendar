import { Suspense } from "react";
import { ExploreFilters } from "@/components/explore/ExploreFilters";
import { EventCard } from "@/components/events/EventCard";
import { exploreOccurrences, getFeaturedTags } from "@/lib/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explorar",
  description: "Descubrí eventos por fecha, tag o zona.",
};

type Props = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    tag?: string;
    zone?: string;
  }>;
};

export default async function ExplorarPage({ searchParams }: Props) {
  const params = await searchParams;
  const tags = await getFeaturedTags(50);
  const results = await exploreOccurrences({
    from: params.from,
    to: params.to,
    tag: params.tag,
    zone: params.zone,
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Explorar</h1>
        <p className="mt-1 text-ink-muted">Filtrá por fecha, tag o zona.</p>
      </header>

      <Suspense fallback={<div className="card h-32 animate-pulse bg-canvas" />}>
        <ExploreFilters tags={tags} />
      </Suspense>

      <section className="mt-8" aria-label="Resultados">
        {results.length === 0 ? (
          <p className="text-ink-muted">No encontramos eventos con esos filtros.</p>
        ) : (
          <ul className="space-y-3">
            {results.map((event) => (
              <li key={event.occurrence_id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
