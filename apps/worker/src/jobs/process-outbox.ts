import { z } from "zod";
import { getSupabase, type OutboxJob } from "../lib/supabase.js";
import { log } from "../lib/logger.js";
import { loadConfig } from "../config.js";
import { regenerateOccurrences } from "./regenerate-occurrences.js";
import { syncGoogleCalendar } from "./google-sync.js";
import { enqueueBirthdayReminders } from "./birthday-reminders.js";

const MAX_ATTEMPTS = 5;
const RETRY_BASE_SECONDS = 30;

const regeneratePayload = z.object({ eventId: z.string().uuid() });
const googleSyncPayload = z.object({
  connectionId: z.string().uuid(),
  syncId: z.string().uuid().optional(),
  rsvpId: z.string().uuid().optional(),
  externalEventId: z.string().optional(),
});
const emailPayload = z.object({
  kind: z.string(),
  userId: z.string().uuid(),
  subject: z.string(),
  date: z.string().optional(),
  birthdays: z.array(z.record(z.unknown())).optional(),
});

export async function claimPendingJobs(limit?: number): Promise<OutboxJob[]> {
  const supabase = getSupabase();
  const batchSize = limit ?? loadConfig().WORKER_BATCH_SIZE;
  const now = new Date().toISOString();

  const { data: pending, error } = await supabase
    .from("outbox_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("run_after", now)
    .order("run_after", { ascending: true })
    .limit(batchSize);

  if (error) throw new Error(error.message);
  if (!pending?.length) return [];

  const claimed: OutboxJob[] = [];
  for (const job of pending as OutboxJob[]) {
    const { data, error: claimError } = await supabase
      .from("outbox_jobs")
      .update({ status: "processing", updated_at: now })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimError) {
      log("warn", "Claim fallido", { jobId: job.id, error: claimError.message });
      continue;
    }
    if (data) claimed.push(data as OutboxJob);
  }

  return claimed;
}

async function markDone(jobId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("outbox_jobs")
    .update({ status: "done", updated_at: new Date().toISOString(), last_error: null })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
}

async function markFailed(job: OutboxJob, message: string): Promise<void> {
  const supabase = getSupabase();
  const attempts = job.attempts + 1;
  const failed = attempts >= MAX_ATTEMPTS;
  const runAfter = new Date(Date.now() + RETRY_BASE_SECONDS * attempts * 1000).toISOString();

  const { error } = await supabase
    .from("outbox_jobs")
    .update({
      status: failed ? "failed" : "pending",
      attempts,
      last_error: message.slice(0, 2000),
      run_after: failed ? job.run_after : runAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (error) throw new Error(error.message);
}

async function handleSendReminderEmail(payload: unknown): Promise<void> {
  const parsed = emailPayload.parse(payload);
  // Stub: integrar Resend/SendGrid más adelante
  log("info", "[email stub] send_reminder_email", {
    userId: parsed.userId,
    kind: parsed.kind,
    subject: parsed.subject,
    date: parsed.date,
    count: parsed.birthdays?.length ?? 0,
  });
}

export async function processJob(job: OutboxJob): Promise<void> {
  switch (job.job_type) {
    case "regenerate_occurrences": {
      const { eventId } = regeneratePayload.parse(job.payload);
      await regenerateOccurrences(eventId);
      break;
    }
    case "google_sync_create": {
      const payload = googleSyncPayload.parse(job.payload);
      await syncGoogleCalendar("create", payload);
      break;
    }
    case "google_sync_update": {
      const payload = googleSyncPayload.parse(job.payload);
      await syncGoogleCalendar("update", payload);
      break;
    }
    case "google_sync_delete": {
      const payload = googleSyncPayload.parse(job.payload);
      await syncGoogleCalendar("delete", payload);
      break;
    }
    case "send_reminder_email": {
      await handleSendReminderEmail(job.payload);
      break;
    }
    case "birthday_reminders_scan": {
      await enqueueBirthdayReminders();
      break;
    }
    default:
      throw new Error(`job_type desconocido: ${job.job_type}`);
  }
}

export async function processOutboxOnce(): Promise<{ processed: number; failed: number }> {
  const jobs = await claimPendingJobs();
  if (jobs.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processJob(job);
      await markDone(job.id);
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log("error", "Job falló", { jobId: job.id, jobType: job.job_type, error: message });
      await markFailed(job, message);
      failed += 1;
    }
  }

  return { processed, failed };
}
