import { z } from "zod";
import { createServiceClient } from "../lib/supabase.js";

const CreateReportSchema = z.object({
  subjectType: z.enum(["event", "profile", "occurrence"]),
  subjectId: z.string().uuid(),
  reason: z.string().min(3).max(120),
  details: z.string().max(2000).optional(),
});

const RATE_LIMITS = {
  create_event: { max: 20, windowMs: 24 * 60 * 60 * 1000 },
  import_ics: { max: 5, windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

function windowStart(now: Date, windowMs: number): Date {
  const bucket = Math.floor(now.getTime() / windowMs) * windowMs;
  return new Date(bucket);
}

export async function checkRateLimit(userId: string, action: RateLimitAction): Promise<void> {
  const db = createServiceClient();
  const rule = RATE_LIMITS[action];
  const now = new Date();
  const start = windowStart(now, rule.windowMs);

  const { data: existing, error: readError } = await db
    .from("rate_limits")
    .select("count")
    .eq("user_id", userId)
    .eq("action", action)
    .eq("window_start", start.toISOString())
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const nextCount = (existing?.count ?? 0) + 1;
  if (nextCount > rule.max) {
    throw new Error(`Rate limit exceeded for ${action}`);
  }

  const { error: upsertError } = await db.from("rate_limits").upsert(
    {
      user_id: userId,
      action,
      window_start: start.toISOString(),
      count: nextCount,
    },
    { onConflict: "user_id,action,window_start" },
  );

  if (upsertError) throw new Error(upsertError.message);
}

export async function createReport(reporterId: string, input: unknown) {
  const db = createServiceClient();
  const parsed = CreateReportSchema.parse(input);

  const { data, error } = await db
    .from("reports")
    .insert({
      reporter_id: reporterId,
      subject_type: parsed.subjectType,
      subject_id: parsed.subjectId,
      reason: parsed.reason,
      details: parsed.details ?? null,
      status: "open",
    })
    .select("id, subject_type, subject_id, reason, status, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create report");

  return {
    id: String(data.id),
    subjectType: String(data.subject_type),
    subjectId: String(data.subject_id),
    reason: String(data.reason),
    status: String(data.status),
    createdAt: String(data.created_at),
  };
}
