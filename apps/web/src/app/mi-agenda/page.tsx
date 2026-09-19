import Link from "next/link";
import { redirect } from "next/navigation";
import { Cake } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { createClient } from "@/lib/supabase/server";
import {
  getFollowingOccurrences,
  getGoingOccurrences,
  getNetworkBirthdays,
} from "@/lib/queries";
import { formatBirthday } from "@/lib/dates";

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
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Mi agenda</h1>
        <p className="mt-1 text-ink-muted">Lo que seguís y a lo que vas.</p>
      </header>

      <nav className="mb-6 flex gap-2" aria-label="Pestañas">
        <Link
          href="/mi-agenda?tab=siguiendo"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab !== "voy"
              ? "bg-accent text-white"
              : "bg-surface text-ink-muted hover:bg-canvas"
          }`}
          aria-current={tab !== "voy" ? "page" : undefined}
        >
          Siguiendo
        </Link>
        <Link
          href="/mi-agenda?tab=voy"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "voy"
              ? "bg-accent text-white"
              : "bg-surface text-ink-muted hover:bg-canvas"
          }`}
          aria-current={tab === "voy" ? "page" : undefined}
        >
          Voy
        </Link>
      </nav>

      <section aria-label="Eventos">
        {events.length === 0 ? (
          <p className="text-ink-muted">
            {tab === "voy"
              ? "Todavía no marcaste ningún evento como «Voy»."
              : "Seguí promotores para ver sus eventos acá."}
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.occurrence_id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="birthdays-heading">
        <h2 id="birthdays-heading" className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
          <Cake className="h-5 w-5 text-accent" aria-hidden />
          Fechas de mi red
        </h2>
        {birthdays.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Cuando sigas perfiles con cumpleaños visible, aparecerán acá (solo día y mes).
          </p>
        ) : (
          <ul className="space-y-2">
            {birthdays.map((b) => (
              <li key={b.profile_id} className="card flex items-center justify-between py-3">
                <Link href={`/a/${b.slug}`} className="font-medium text-ink hover:text-accent">
                  {b.display_name}
                </Link>
                <span className="text-sm text-ink-muted">
                  {formatBirthday(b.birthday_month, b.birthday_day)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
