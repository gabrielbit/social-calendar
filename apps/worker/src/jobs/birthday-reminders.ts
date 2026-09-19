import { getSupabase } from "../lib/supabase.js";
import { log } from "../lib/logger.js";

const REMINDER_DAYS_AHEAD = 7;

type BirthdayRow = {
  profile_id: string;
  slug: string;
  display_name: string;
  birthday_month: number;
  birthday_day: number;
  next_date: string;
};

type FollowerPrefs = {
  follower_id: string;
  notify_birthdays: boolean;
  notify_email: boolean;
};

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T12:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  target.setUTCHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Consulta cumpleaños de la red y encola jobs agrupados por destinatario (stub). */
export async function enqueueBirthdayReminders(): Promise<number> {
  const supabase = getSupabase();
  const { data: followers, error: prefsError } = await supabase
    .from("user_preferences")
    .select("user_id, notify_birthdays, notify_email")
    .eq("notify_birthdays", true)
    .eq("notify_email", true);

  if (prefsError) throw new Error(prefsError.message);
  if (!followers?.length) return 0;

  let enqueued = 0;

  for (const pref of followers) {
    const viewerId = pref.user_id as string;
    const { data: birthdays, error: bError } = await supabase.rpc("network_birthdays", {
      p_viewer: viewerId,
    });

    if (bError) {
      log("warn", "network_birthdays falló", { viewerId, error: bError.message });
      continue;
    }

    const upcoming = ((birthdays ?? []) as BirthdayRow[]).filter((b) => {
      const days = daysUntil(b.next_date);
      return days >= 0 && days <= REMINDER_DAYS_AHEAD;
    });

    if (upcoming.length === 0) continue;

    const groupedByDate = new Map<string, BirthdayRow[]>();
    for (const row of upcoming) {
      const list = groupedByDate.get(row.next_date) ?? [];
      list.push(row);
      groupedByDate.set(row.next_date, list);
    }

    for (const [date, people] of groupedByDate) {
      const names = people.map((p) => p.display_name).join(", ");
      const { error: insertError } = await supabase.from("outbox_jobs").insert({
        job_type: "send_reminder_email",
        payload: {
          kind: "birthday_digest",
          userId: viewerId,
          date,
          birthdays: people.map((p) => ({
            profileId: p.profile_id,
            slug: p.slug,
            displayName: p.display_name,
          })),
          subject: `Cumpleaños próximos: ${names}`,
        },
      });

      if (insertError) {
        log("warn", "No se pudo encolar reminder", { viewerId, error: insertError.message });
        continue;
      }
      enqueued += 1;
    }
  }

  log("info", "Birthday reminders encolados", { enqueued });
  return enqueued;
}
