import { expandRrule } from "@agenda/domain";
import { getSupabase } from "../lib/supabase.js";
import { log } from "../lib/logger.js";

export const OCCURRENCE_HORIZON_DAYS = 365;

type EventRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
  rrule: string | null;
};

export function horizonEndFrom(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + OCCURRENCE_HORIZON_DAYS);
  return end;
}

export function buildOccurrenceRows(
  event: EventRow,
  seeds: ReturnType<typeof expandRrule>,
): Array<{
  event_id: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
  is_exception: boolean;
}> {
  return seeds.map((seed) => ({
    event_id: event.id,
    starts_at: seed.startsAt.toISOString(),
    ends_at: seed.endsAt.toISOString(),
    all_day: seed.allDay,
    timezone: seed.timezone,
    is_exception: false,
  }));
}

export async function regenerateOccurrences(eventId: string): Promise<number> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, starts_at, ends_at, all_day, timezone, rrule, deleted_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  if (!event || event.deleted_at) {
    log("warn", "Evento no encontrado o eliminado; omitiendo regeneración", { eventId });
    return 0;
  }

  const { error: deleteError } = await supabase
    .from("event_occurrences")
    .delete()
    .eq("event_id", eventId)
    .eq("is_exception", false)
    .gte("starts_at", nowIso);

  if (deleteError) throw new Error(deleteError.message);

  const horizonEnd = horizonEndFrom();
  const seeds = expandRrule({
    startsAt: new Date(event.starts_at),
    endsAt: new Date(event.ends_at),
    rrule: event.rrule,
    horizonEnd,
    allDay: event.all_day,
    timezone: event.timezone,
  });

  const rows = buildOccurrenceRows(event, seeds).filter((row) => row.starts_at >= nowIso);
  if (rows.length === 0) {
    log("info", "Sin ocurrencias futuras para insertar", { eventId });
    return 0;
  }

  const { error: insertError } = await supabase
    .from("event_occurrences")
    .upsert(rows, { onConflict: "event_id,starts_at", ignoreDuplicates: true });

  if (insertError) throw new Error(insertError.message);

  log("info", "Ocurrencias regeneradas", { eventId, count: rows.length });
  return rows.length;
}
