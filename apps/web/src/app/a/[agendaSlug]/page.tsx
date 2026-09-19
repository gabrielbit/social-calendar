import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Users } from "lucide-react";
import { AgendaCalendar } from "@/components/calendar/AgendaCalendar";
import { EventCard } from "@/components/events/EventCard";
import { formatBirthday } from "@/lib/dates";
import {
  getAgendaOccurrences,
  getPrimaryAgendaId,
  getProfileBySlug,
} from "@/lib/queries";
import type { Metadata } from "next";

type Props = { params: Promise<{ agendaSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agendaSlug } = await params;
  const profile = await getProfileBySlug(agendaSlug);
  if (!profile) return { title: "Agenda no encontrada" };
  return {
    title: profile.display_name,
    description: profile.bio ?? `Agenda pública de ${profile.display_name}`,
  };
}

export default async function AgendaPage({ params }: Props) {
  const { agendaSlug } = await params;
  const profile = await getProfileBySlug(agendaSlug);
  if (!profile) notFound();

  const agendaId = await getPrimaryAgendaId(profile.id);
  if (!agendaId) notFound();

  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  const to = new Date();
  to.setMonth(to.getMonth() + 6);

  const occurrences = await getAgendaOccurrences(
    agendaId,
    from.toISOString(),
    to.toISOString(),
  );

  const attributed = occurrences.filter((o) => o.inclusion_reason !== "own");
  const mobileEvents = occurrences.map((o) => ({
    occurrence_id: o.occurrence_id,
    title: o.title,
    starts_at: o.starts_at,
    ends_at: o.ends_at,
    all_day: o.all_day,
    timezone: o.timezone,
    cover_image_url: o.cover_image_url,
    author_slug: o.original_promoter_slug,
    author_name: o.original_promoter_name,
    zone: null,
    tag_slugs: [] as string[],
  }));

  return (
    <div>
      <header className="mb-8">
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
              <Image src={profile.avatar_url} alt="" fill className="object-cover" sizes="64px" />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xl font-bold text-accent">
              {profile.display_name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-ink">{profile.display_name}</h1>
            <p className="text-sm capitalize text-ink-muted">{profile.profile_type}</p>
            {profile.public_location && (
              <p className="mt-1 text-sm text-ink-faint">{profile.public_location}</p>
            )}
            {profile.bio && <p className="mt-3 max-w-xl text-ink-muted">{profile.bio}</p>}
            {profile.birthday_month && profile.birthday_day && (
              <p className="mt-2 text-sm text-ink-faint">
                🎂 {formatBirthday(profile.birthday_month, profile.birthday_day)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" aria-hidden />
            {occurrences.length} eventos próximos
          </span>
          {attributed.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" aria-hidden />
              {attributed.length} con atribución
            </span>
          )}
        </div>
      </header>

      {attributed.length > 0 && (
        <section className="mb-6 rounded-lg border border-accent/20 bg-accent-soft/50 p-3 text-sm text-ink-muted">
          <p className="font-medium text-ink">Atribución</p>
          <p className="mt-1">
            Esta agenda incluye eventos curados de otros promotores, siempre con crédito al autor
            original.
          </p>
        </section>
      )}

      <AgendaCalendar occurrences={occurrences} agendaSlug={agendaSlug} />

      <section className="mt-6 md:hidden" aria-label="Lista de eventos">
        <h2 className="mb-4 text-lg font-semibold text-ink">Próximos eventos</h2>
        {mobileEvents.length === 0 ? (
          <p className="text-ink-muted">No hay eventos en este rango.</p>
        ) : (
          <ul className="space-y-3">
            {mobileEvents.map((ev) => (
              <li key={ev.occurrence_id}>
                <EventCard
                  event={ev}
                  href={`/a/${agendaSlug}/e/${ev.occurrence_id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center">
        <Link href={`/explorar`} className="text-sm text-accent hover:underline">
          Explorar más eventos →
        </Link>
      </p>
    </div>
  );
}
