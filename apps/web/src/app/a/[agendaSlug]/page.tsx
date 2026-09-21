import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AgendaCalendar } from "@/components/calendar/AgendaCalendar";
import { MiniMonth } from "@/components/calendar/MiniMonth";
import { EventDayList } from "@/components/events/EventDayList";
import { FollowButton } from "@/components/agenda/FollowButton";
import { ShareBar } from "@/components/agenda/ShareBar";
import { ViewSwitcher, parseVista } from "@/components/agenda/ViewSwitcher";
import { AgendaSources } from "@/components/agenda/AgendaSources";
import { Container } from "@/components/layout/Container";
import { occurrenceToExplore, sourcesFromOccurrences } from "@/lib/events";
import { eventDayKey, formatBirthday } from "@/lib/dates";
import { profileTypeLabel } from "@/lib/labels";
import { ContactLinks } from "@/components/contact/ContactLinks";
import { createClient } from "@/lib/supabase/server";
import {
  getAgendaOccurrences,
  getIsFollowing,
  getPrimaryAgendaId,
  getProfileBySlug,
  getProfileSocialStats,
} from "@/lib/queries";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ agendaSlug: string }>;
  searchParams: Promise<{ vista?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agendaSlug } = await params;
  const profile = await getProfileBySlug(agendaSlug);
  if (!profile) return { title: "Agenda no encontrada" };
  return {
    title: profile.display_name,
    description: profile.bio ?? `Agenda pública de ${profile.display_name}`,
  };
}

export default async function AgendaPage({ params, searchParams }: Props) {
  const { agendaSlug } = await params;
  const { vista: vistaParam } = await searchParams;
  const vista = parseVista(vistaParam);

  const profile = await getProfileBySlug(agendaSlug);
  if (!profile) notFound();

  const agendaId = await getPrimaryAgendaId(profile.id);
  if (!agendaId) notFound();

  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  const to = new Date();
  to.setMonth(to.getMonth() + 6);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [occurrences, stats, following] = await Promise.all([
    getAgendaOccurrences(agendaId, from.toISOString(), to.toISOString()),
    getProfileSocialStats(profile.id),
    getIsFollowing(profile.id, user?.id),
  ]);

  const ownCount = occurrences.filter((o) => o.inclusion_reason === "own").length;
  const curatedCount = occurrences.length - ownCount;
  const events = occurrences.map(occurrenceToExplore);
  const sources = sourcesFromOccurrences(occurrences, agendaSlug);
  const eventDays = [...new Set(occurrences.map((o) => eventDayKey(o.starts_at, o.timezone)))];
  const isOwn = user?.id === profile.id;
  const showSidebar = vista === "mes";
  const showList = vista !== "calendario";

  const statsItems = [
    { label: "seguidores", value: stats.followers },
    { label: "propios", value: ownCount },
    curatedCount > 0 ? { label: "curados", value: curatedCount } : null,
    stats.republishers > 0 ? { label: "agendas", value: stats.republishers } : null,
  ].filter((item): item is { label: string; value: number } => item !== null);

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-8">
        <div className="flex items-start gap-4 sm:gap-5">
          {profile.avatar_url ? (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl sm:size-20">
              <Image src={profile.avatar_url} alt="" fill className="object-cover" sizes="80px" />
            </div>
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-surface text-xl text-accent sm:size-20">
              {profile.display_name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="page-title">{profile.display_name}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {profileTypeLabel(profile.profile_type)}
              {profile.public_location ? ` · ${profile.public_location}` : ""}
            </p>
            {profile.bio ? <p className="mt-3 max-w-xl text-pretty text-ink-muted">{profile.bio}</p> : null}
            {profile.allow_contact &&
            (profile.instagram_handle || profile.whatsapp_phone || profile.contact_email) ? (
              <div className="mt-4">
                <ContactLinks
                  contact={{
                    allowContact: profile.allow_contact,
                    instagram: profile.instagram_handle,
                    whatsapp: profile.whatsapp_phone,
                    email: profile.contact_email,
                  }}
                  message={`Hola ${profile.display_name}! Te escribo desde Agenda Comunidad`}
                  emailSubject={`Consulta para ${profile.display_name}`}
                />
              </div>
            ) : null}
            {profile.birthday_month && profile.birthday_day ? (
              <p className="mt-2 text-sm text-ink-faint">
                {formatBirthday(profile.birthday_month, profile.birthday_day)}
              </p>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {statsItems.map((item) => (
            <div key={item.label} className="flex items-baseline gap-1.5">
              <dt className="sr-only">{item.label}</dt>
                <dd className="font-medium tabular-nums text-ink">
                  {item.value} <span className="font-normal text-ink-muted">{item.label}</span>
                </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {isOwn ? (
            <Link href="/settings" className="btn-secondary">
              Editar perfil
            </Link>
          ) : (
            <FollowButton
              profileId={profile.id}
              agendaSlug={agendaSlug}
              initialFollowing={following}
              loggedIn={Boolean(user)}
            />
          )}
          <ShareBar
            title={profile.display_name}
            path={`/a/${agendaSlug}`}
            events={occurrences.map((o) => ({
              occurrenceId: o.occurrence_id,
              title: o.title,
              startsAt: o.starts_at,
              endsAt: o.ends_at,
              allDay: o.all_day,
              timezone: o.timezone,
            }))}
          />
        </div>
      </header>

      <div className="mb-8">
        <ViewSwitcher slug={agendaSlug} current={vista} />
      </div>

      <div className={showSidebar ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]" : undefined}>
        <div>
          {showList ? (
            <EventDayList
              events={events}
              hrefFor={(event) => `/a/${agendaSlug}/e/${event.occurrence_id}`}
              empty={
                <div className="rounded-2xl border border-border px-6 py-16 text-center">
                  <p className="text-pretty text-ink-muted">No hay eventos en este rango.</p>
                  <Link href="/explorar" className="btn-secondary mt-6">
                    Explorar eventos
                  </Link>
                </div>
              }
            />
          ) : (
            <AgendaCalendar occurrences={occurrences} agendaSlug={agendaSlug} />
          )}
        </div>

        {showSidebar ? (
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <MiniMonth eventDays={eventDays} />
            <AgendaSources sources={sources} />
          </aside>
        ) : null}
      </div>
    </Container>
  );
}
