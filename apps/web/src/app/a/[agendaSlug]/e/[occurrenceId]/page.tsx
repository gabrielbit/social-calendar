import { notFound } from "next/navigation";
import { EventDetailView } from "@/components/events/EventDetailView";
import { Container } from "@/components/layout/Container";
import { getOccurrenceDetail, getProfileBySlug } from "@/lib/queries";
import type { Metadata } from "next";
import { appUrl } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ agendaSlug: string; occurrenceId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { occurrenceId } = await params;
  const occurrence = await getOccurrenceDetail(occurrenceId);
  if (!occurrence) return { title: "Evento no encontrado" };
  return {
    title: occurrence.event.title,
    alternates: { canonical: appUrl(`/e/${occurrenceId}`) },
  };
}

export default async function ContextualEventPage({ params }: Props) {
  const { agendaSlug, occurrenceId } = await params;
  const [profile, occurrence] = await Promise.all([
    getProfileBySlug(agendaSlug),
    getOccurrenceDetail(occurrenceId),
  ]);

  if (!profile || !occurrence || occurrence.cancelled) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Container className="py-10 sm:py-14">
      <p className="mb-6 text-sm text-ink-faint">
        Evento en la agenda de{" "}
        <span className="text-ink">{profile.display_name}</span>
      </p>
      <EventDetailView
        occurrence={occurrence}
        agendaSlug={agendaSlug}
        showCanonicalLink
        canEdit={Boolean(
          user && (user.id === occurrence.event.author_id || user.id === occurrence.event.author?.id),
        )}
      />
    </Container>
  );
}
