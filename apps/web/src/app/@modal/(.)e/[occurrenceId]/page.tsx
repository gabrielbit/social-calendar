import { notFound } from "next/navigation";
import { EventDetailDialog } from "@/components/events/EventDetailDialog";
import { EventDetailView } from "@/components/events/EventDetailView";
import { getOccurrenceDetail } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

import { safeReturnPath } from "@/lib/return-to";

type Props = { params: Promise<{ occurrenceId: string }>; searchParams: Promise<{ volver?: string }> };

export default async function EventDetailModalPage({ params, searchParams }: Props) {
  const { occurrenceId } = await params;
  const { volver } = await searchParams;
  const occurrence = await getOccurrenceDetail(occurrenceId);
  if (!occurrence || occurrence.cancelled) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <EventDetailDialog>
      <EventDetailView
        occurrence={occurrence}
        canEdit={Boolean(
          user && (user.id === occurrence.event.author_id || user.id === occurrence.event.author?.id),
        )}
        returnTo={safeReturnPath(volver)}
      />
    </EventDetailDialog>
  );
}
