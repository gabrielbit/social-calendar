import { DEFAULT_TIMEZONE } from "./schemas.js";

export type OccurrenceSeed = {
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  timezone: string;
  isException?: boolean;
  cancelled?: boolean;
};

/** Resolve Feb 29 birthday to Feb 28 in non-leap years. */
export function resolveBirthdayDate(year: number, month: number, day: number): Date {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return new Date(Date.UTC(year, 1, 28));
  }
  return new Date(Date.UTC(year, month - 1, day));
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Expand a simple RRULE (FREQ=DAILY|WEEKLY|MONTHLY) into occurrence seeds.
 * Full RRULE library can replace this later; covers MVP weekly/daily cases.
 */
export function expandRrule(opts: {
  startsAt: Date;
  endsAt: Date;
  rrule: string | null | undefined;
  horizonEnd: Date;
  allDay?: boolean;
  timezone?: string;
}): OccurrenceSeed[] {
  const {
    startsAt,
    endsAt,
    rrule,
    horizonEnd,
    allDay = false,
    timezone = DEFAULT_TIMEZONE,
  } = opts;
  const durationMs = Math.max(0, endsAt.getTime() - startsAt.getTime());

  if (!rrule) {
    return [{ startsAt, endsAt, allDay, timezone }];
  }

  const freq = /FREQ=(DAILY|WEEKLY|MONTHLY)/i.exec(rrule)?.[1]?.toUpperCase();
  const interval = Number(/INTERVAL=(\d+)/i.exec(rrule)?.[1] ?? 1);
  const count = Number(/COUNT=(\d+)/i.exec(rrule)?.[1] ?? 0);
  const untilMatch = /UNTIL=(\d{8}(T\d{6}Z)?)/i.exec(rrule)?.[1];
  let until = horizonEnd;
  if (untilMatch) {
    const parsed = parseIcsDate(untilMatch);
    if (parsed && parsed < until) until = parsed;
  }

  if (!freq || interval < 1) {
    return [{ startsAt, endsAt, allDay, timezone }];
  }

  const results: OccurrenceSeed[] = [];
  let cursor = new Date(startsAt);
  let n = 0;
  while (cursor <= until && cursor <= horizonEnd) {
    results.push({
      startsAt: new Date(cursor),
      endsAt: new Date(cursor.getTime() + durationMs),
      allDay,
      timezone,
    });
    n += 1;
    if (count > 0 && n >= count) break;
    cursor = addByFreq(cursor, freq, interval);
  }
  return results;
}

function addByFreq(date: Date, freq: string, interval: number): Date {
  const d = new Date(date);
  if (freq === "DAILY") d.setUTCDate(d.getUTCDate() + interval);
  else if (freq === "WEEKLY") d.setUTCDate(d.getUTCDate() + 7 * interval);
  else if (freq === "MONTHLY") d.setUTCMonth(d.getUTCMonth() + interval);
  return d;
}

function parseIcsDate(value: string): Date | null {
  if (/^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    return new Date(Date.UTC(y, m, d));
  }
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    const hh = Number(value.slice(9, 11));
    const mm = Number(value.slice(11, 13));
    const ss = Number(value.slice(13, 15));
    return new Date(Date.UTC(y, m, d, hh, mm, ss));
  }
  return null;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
