import { Suspense } from "react";
import Link from "next/link";
import { ExploreFilters } from "@/components/explore/ExploreFilters";
import { EventDayList } from "@/components/events/EventDayList";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
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
    <Container className="py-8 sm:py-12">
      <PageHeader title="Agenda pública" description="Filtrá por fecha, tag o zona." />

      <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-surface" />}>
        <ExploreFilters tags={tags} />
      </Suspense>

      <section className="mt-10" aria-label="Resultados">
        <EventDayList
          events={results}
          empty={
            <div className="rounded-2xl border border-border px-6 py-16 text-center">
              <p className="text-pretty text-ink-muted">No encontramos eventos con esos filtros.</p>
              <Link href="/explorar" className="btn-secondary mt-6">
                Limpiar filtros
              </Link>
            </div>
          }
        />
      </section>
    </Container>
  );
}
