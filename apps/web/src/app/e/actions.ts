"use server";

import { getOccurrenceDetail } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { OccurrenceDetail } from "@/lib/types";

export async function loadOccurrenceDetail(occurrenceId: string): Promise<{
  occurrence: OccurrenceDetail;
  canEdit: boolean;
} | null> {
  const occurrence = await getOccurrenceDetail(occurrenceId);
  if (!occurrence || occurrence.cancelled) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    occurrence,
    canEdit: Boolean(
      user && (user.id === occurrence.event.author_id || user.id === occurrence.event.author?.id),
    ),
  };
}
