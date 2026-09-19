import { describe, expect, it, vi, beforeEach } from "vitest";
import { expandRrule } from "@agenda/domain";
import {
  buildOccurrenceRows,
  horizonEndFrom,
  OCCURRENCE_HORIZON_DAYS,
} from "../jobs/regenerate-occurrences.js";

describe("regenerateOccurrences helpers", () => {
  it("usa horizonte de 365 días", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const end = horizonEndFrom(from);
    const diffDays = Math.round((end.getTime() - from.getTime()) / 86_400_000);
    expect(diffDays).toBe(OCCURRENCE_HORIZON_DAYS);
  });

  it("construye filas de ocurrencias desde expandRrule", () => {
    const startsAt = new Date("2026-09-21T15:00:00Z");
    const endsAt = new Date("2026-09-21T16:00:00Z");
    const seeds = expandRrule({
      startsAt,
      endsAt,
      rrule: "FREQ=WEEKLY;INTERVAL=1",
      horizonEnd: new Date("2026-10-21T00:00:00Z"),
    });

    const event = {
      id: "11111111-1111-1111-1111-111111111111",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      all_day: false,
      timezone: "America/Argentina/Buenos_Aires",
      rrule: "FREQ=WEEKLY;INTERVAL=1",
    };

    const rows = buildOccurrenceRows(event, seeds);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0]).toMatchObject({
      event_id: event.id,
      is_exception: false,
      timezone: event.timezone,
    });
  });
});

describe("claimPendingJobs idempotency", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("solo reclama jobs que siguen pending (optimistic claim)", async () => {
    const pendingJob = {
      id: "job-1",
      job_type: "regenerate_occurrences",
      payload: { eventId: "11111111-1111-1111-1111-111111111111" },
      status: "pending",
      attempts: 0,
      run_after: new Date().toISOString(),
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updateMock = vi.fn().mockImplementation(({ status }) => {
      if (status === "processing") {
        return {
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { ...pendingJob, status: "processing" }, error: null }),
              }),
            }),
          }),
        };
      }
      return { eq: vi.fn() };
    });

    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [pendingJob], error: null }),
    };

    const fromMock = vi.fn((table: string) => {
      if (table !== "outbox_jobs") throw new Error("unexpected table");
      return {
        select: vi.fn().mockReturnValue(selectChain),
        update: updateMock,
      };
    });

    vi.doMock("../lib/supabase.js", () => ({
      getSupabase: () => ({ from: fromMock }),
    }));
    vi.doMock("../config.js", () => ({
      loadConfig: () => ({ WORKER_BATCH_SIZE: 10 }),
    }));

    const { claimPendingJobs: claim } = await import("../jobs/process-outbox.js");
    const claimed = await claim(1);

    expect(claimed).toHaveLength(1);
    expect(claimed[0]!.status).toBe("processing");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing" }),
    );
  });

  it("no reclama si otro worker ganó la carrera", async () => {
    const pendingJob = {
      id: "job-2",
      job_type: "send_reminder_email",
      payload: {},
      status: "pending",
      attempts: 0,
      run_after: new Date().toISOString(),
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [pendingJob], error: null }),
    };

    const fromMock = vi.fn(() => ({
      select: vi.fn().mockReturnValue(selectChain),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }));

    vi.doMock("../lib/supabase.js", () => ({
      getSupabase: () => ({ from: fromMock }),
    }));
    vi.doMock("../config.js", () => ({
      loadConfig: () => ({ WORKER_BATCH_SIZE: 10 }),
    }));

    const { claimPendingJobs: claim } = await import("../jobs/process-outbox.js");
    const claimed = await claim(1);
    expect(claimed).toHaveLength(0);
  });
});
