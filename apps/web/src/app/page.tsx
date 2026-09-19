import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Constellation } from "@/components/home/Constellation";
import { getFeaturedTags } from "@/lib/queries";

export default async function HomePage() {
  const tags = await getFeaturedTags(8);

  const nodes = tags.map((t) => ({
    slug: t.slug,
    name: t.name,
    kind: "tag" as const,
  }));

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
      <section>
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-accent">
          Tu red, tus eventos
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          Agendas públicas que se construyen en comunidad
        </h1>
        <p className="mt-4 max-w-lg text-lg text-ink-muted">
          Descubrí eventos, seguí promotores y curá tu propia agenda con atribución al autor
          original.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/explorar" className="btn-primary">
            Explorar eventos
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/auth/login" className="btn-secondary">
            Crear mi agenda
          </Link>
        </div>
      </section>

      <section aria-labelledby="constellation-heading">
        <h2 id="constellation-heading" className="sr-only">
          Tags y promotores destacados
        </h2>
        {nodes.length > 0 ? (
          <Constellation nodes={nodes} />
        ) : (
          <div className="card flex aspect-[4/3] items-center justify-center text-ink-muted">
            Pronto: constelación de tags
          </div>
        )}
      </section>
    </div>
  );
}
