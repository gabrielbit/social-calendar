import { notFound } from "next/navigation";
import { EventDetailView } from "@/components/events/EventDetailView";
import { getOccurrenceDetail, getProfileBySlug } from "@/lib/queries";
import type { Metadata } from "next";
import { appUrl } from "@/lib/dates";

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

  return (
    <div>
      <p className="mb-4 text-sm text-ink-faint">
        Evento en la agenda de{" "}
        <span className="font-medium text-ink">{profile.display_name}</span>
      </p>
      <EventDetailView
        occurrence={occurrence}
        agendaSlug={agendaSlug}
        showCanonicalLink
      />
    </div>
  );
}
