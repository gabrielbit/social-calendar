import Link from "next/link";
import { Constellation } from "@/components/home/Constellation";
import { EventDayList } from "@/components/events/EventDayList";
import { Container } from "@/components/layout/Container";
import { exploreOccurrences, getFeaturedTags } from "@/lib/queries";

export default async function HomePage() {
  const [tags, events] = await Promise.all([
    getFeaturedTags(8),
    exploreOccurrences({ limit: 12 }),
  ]);

  const nodes = tags.map((t) => ({
    slug: t.slug,
    name: t.name,
    kind: "tag" as const,
  }));

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-10 max-w-xl">
        <p className="text-sm text-accent">Agenda pública</p>
        <h1 className="page-title mt-2">Eventos de la comunidad</h1>
        <p className="page-lede">
          Descubrí eventos, seguí promotores y curá tu agenda con atribución al autor original.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/auth/login" className="btn-primary">
            Crear mi agenda
          </Link>
          <Link href="/explorar" className="btn-secondary">
            Explorar
          </Link>
        </div>
      </header>

      <section aria-label="Próximos eventos">
        <EventDayList
          events={events}
          empty={
            <div className="rounded-2xl border border-border px-6 py-16 text-center">
              <p className="text-pretty text-ink-muted">Todavía no hay eventos publicados.</p>
              <Link href="/events/new" className="btn-primary mt-6">
                Crear evento
              </Link>
            </div>
          }
        />
        {events.length > 0 ? (
          <p className="mt-10">
            <Link href="/explorar" className="text-sm text-ink-muted hover:text-ink">
              Ver todos los eventos
            </Link>
          </p>
        ) : null}
      </section>

      <section className="mt-16 pb-8" aria-labelledby="constellation-heading">
        <div className="mb-6 max-w-lg">
          <h2 id="constellation-heading" className="text-xl font-semibold text-ink">
            La red
          </h2>
          <p className="mt-2 text-pretty text-ink-muted">
            Tags y comunidades que están moviendo la agenda.
          </p>
        </div>
        {nodes.length > 0 ? (
          <Constellation nodes={nodes} />
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center rounded-2xl border border-border text-ink-muted">
            Pronto: constelación de tags
          </div>
        )}
      </section>
    </Container>
  );
}
