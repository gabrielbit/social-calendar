import Link from "next/link";
import { redirect } from "next/navigation";
import { EventDayList } from "@/components/events/EventDayList";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";
import {
  getFollowingOccurrences,
  getGoingOccurrences,
  getNetworkBirthdays,
} from "@/lib/queries";
import { formatBirthday } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function MiAgendaPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/mi-agenda");
  }

  const { tab = "siguiendo" } = await searchParams;
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 120 * 86400000).toISOString();

  const [following, going, birthdays] = await Promise.all([
    getFollowingOccurrences(user.id, from, to),
    getGoingOccurrences(user.id, from, to),
    getNetworkBirthdays(),
  ]);

  const events = tab === "voy" ? going : following;

  return (
    <Container className="py-8 sm:py-12">
      <PageHeader title="Mi agenda" description="Lo que seguís y a lo que vas." />

      <nav className="mb-8 flex gap-2" aria-label="Pestañas">
        <Link
          href="/mi-agenda?tab=siguiendo"
          className={cn("pill", tab !== "voy" && "pill-active")}
          aria-current={tab !== "voy" ? "page" : undefined}
        >
          Siguiendo
        </Link>
        <Link
          href="/mi-agenda?tab=voy"
          className={cn("pill", tab === "voy" && "pill-active")}
          aria-current={tab === "voy" ? "page" : undefined}
        >
          Voy
        </Link>
      </nav>

      <section aria-label="Eventos">
        <EventDayList
          events={events}
          empty={
            <div className="rounded-2xl border border-border px-6 py-16 text-center">
              <p className="text-pretty text-ink-muted">
                {tab === "voy"
                  ? "Todavía no marcaste ningún evento como «Voy»."
                  : "Seguí promotores para ver sus eventos acá."}
              </p>
              <Link href="/explorar" className="btn-primary mt-6">
                Explorar eventos
              </Link>
            </div>
          }
        />
      </section>

      <section className="mt-16" aria-labelledby="birthdays-heading">
        <h2 id="birthdays-heading" className="mb-6 text-xl font-semibold text-ink">
          Fechas de mi red
        </h2>
        {birthdays.length === 0 ? (
          <p className="text-pretty text-sm text-ink-muted">
            Cuando sigas perfiles con cumpleaños visible, aparecerán acá (solo día y mes).
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {birthdays.map((b) => (
              <li key={b.profile_id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/a/${b.slug}`} className="font-medium text-ink hover:text-white">
                  {b.display_name}
                </Link>
                <span className="text-sm tabular-nums text-ink-muted">
                  {formatBirthday(b.birthday_month, b.birthday_day)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
