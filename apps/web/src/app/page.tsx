import Link from "next/link";
import { Constellation } from "@/components/home/Constellation";
import { HomeCalendar } from "@/components/calendar/HomeCalendar";
import { Container } from "@/components/layout/Container";
import { createClient } from "@/lib/supabase/server";
import { getFeaturedTags, getHomeCalendar } from "@/lib/queries";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const calendar = await getHomeCalendar(user.id);
    return <HomeCalendar {...calendar} />;
  }

  const tags = await getFeaturedTags(8);
  const nodes = tags.map((tag) => ({
    slug: tag.slug,
    name: tag.name,
    kind: "tag" as const,
  }));

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-10 max-w-xl">
        <p className="text-sm text-accent">Agenda pública</p>
        <h1 className="page-title mt-2">Tu calendario, mezclado</h1>
        <p className="page-lede">
          Lo que seguís, a lo que vas, tu calendario personal y las fechas de tu red. Entrá para verlo junto.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/auth/login" className="btn-primary">
            Entrar a mi calendario
          </Link>
          <Link href="/auth/signup" className="btn-secondary">
            Crear cuenta
          </Link>
          <Link href="/explorar" className="btn-secondary">
            Explorar
          </Link>
        </div>
      </header>

      <section className="pb-8" aria-labelledby="constellation-heading">
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
