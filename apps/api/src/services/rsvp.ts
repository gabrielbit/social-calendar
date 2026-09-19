import { RsvpInputSchema, type RsvpInput } from "@agenda/domain";
import { createServiceClient } from "../lib/supabase.js";
import { enqueueGoogleSyncJob } from "./calendar-sync.js";

export async function upsertRsvp(userId: string, input: RsvpInput) {
  const db = createServiceClient();
  const parsed = RsvpInputSchema.parse(input);

  const { data: occurrence, error: occError } = await db
    .from("event_occurrences")
    .select("id, cancelled")
    .eq("id", parsed.occurrenceId)
    .maybeSingle();

  if (occError) throw new Error(occError.message);
  if (!occurrence) throw new Error("Occurrence not found");
  if (occurrence.cancelled) throw new Error("Occurrence is cancelled");

  const { data, error } = await db
    .from("event_rsvps")
    .upsert(
      {
        occurrence_id: parsed.occurrenceId,
        user_id: userId,
        status: parsed.status,
        profile_visible: parsed.profileVisible,
        ticket_status: parsed.ticketStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "occurrence_id,user_id" },
    )
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to upsert RSVP");

  if (parsed.status === "going" || parsed.status === "not_going") {
    await enqueueGoogleSyncJob({
      userId,
      rsvpId: String(data.id),
      occurrenceId: parsed.occurrenceId,
      status: parsed.status,
    });
  }

  return {
    id: String(data.id),
    occurrenceId: String(data.occurrence_id),
    userId: String(data.user_id),
    status: String(data.status),
    profileVisible: Boolean(data.profile_visible),
    ticketStatus: String(data.ticket_status),
    updatedAt: String(data.updated_at),
  };
}

export async function listUserRsvps(userId: string) {
  const db = createServiceClient();

  const { data, error } = await db
    .from("event_rsvps")
    .select("*, event_occurrences(*, events(id, slug, title, cover_image_url))")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    status: String(row.status),
    profileVisible: Boolean(row.profile_visible),
    ticketStatus: String(row.ticket_status),
    occurrence: row.event_occurrences,
  }));
}
