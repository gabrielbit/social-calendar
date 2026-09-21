import { addDays, startOfMonth, startOfWeek } from "date-fns";
import { format, formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";
import { DEFAULT_TIMEZONE } from "@agenda/domain";

export function formatEventDate(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE,
  allDay = false,
): string {
  const pattern = allDay ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM";
  return formatInTimeZone(new Date(iso), timezone, pattern, { locale: es });
}

export function formatEventTime(
  startsAt: string,
  endsAt: string,
  timezone: string = DEFAULT_TIMEZONE,
  allDay = false,
): string | undefined {
  if (allDay) return undefined;
  const start = formatInTimeZone(new Date(startsAt), timezone, "HH:mm", { locale: es });
  const end = formatInTimeZone(new Date(endsAt), timezone, "HH:mm", { locale: es });
  return `${start} – ${end}`;
}

export function formatBirthday(month: number, day: number): string {
  const date = new Date(2000, month - 1, day);
  return format(date, "d 'de' MMMM", { locale: es });
}

export function formatEventStamp(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE,
): { day: string; month: string } {
  return {
    day: formatInTimeZone(new Date(iso), timezone, "d", { locale: es }),
    month: formatInTimeZone(new Date(iso), timezone, "MMM", { locale: es }).replace(".", ""),
  };
}

export function formatEventClock(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE,
  allDay = false,
): string {
  if (allDay) return "Todo el día";
  return formatInTimeZone(new Date(iso), timezone, "HH:mm", { locale: es });
}

export function formatEventDayColumn(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE,
): { day: string; weekday: string; month: string } {
  return {
    day: formatInTimeZone(new Date(iso), timezone, "d", { locale: es }),
    weekday: formatInTimeZone(new Date(iso), timezone, "EEE", { locale: es })
      .replace(".", "")
      .toUpperCase(),
    month: formatInTimeZone(new Date(iso), timezone, "MMMM", { locale: es }),
  };
}

export function eventDayKey(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(new Date(iso), timezone, "yyyy-MM-dd");
}

export function groupEventsByDay<T extends { starts_at: string; timezone: string }>(
  events: T[],
): { key: string; column: ReturnType<typeof formatEventDayColumn>; events: T[] }[] {
  const map = new Map<string, T[]>();
  for (const event of events) {
    const key = eventDayKey(event.starts_at, event.timezone);
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, group]) => {
    const first = group[0]!;
    return {
      key,
      column: formatEventDayColumn(first.starts_at, first.timezone),
      events: group,
    };
  });
}

export function appUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function capitalizeEs(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function startOfWeekMonday(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const zoned = toZonedTime(date, timezone);
  const start = startOfWeek(zoned, { weekStartsOn: 1 });
  start.setHours(0, 0, 0, 0);
  return fromZonedTime(start, timezone);
}

export function startOfMonthZoned(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const zoned = toZonedTime(date, timezone);
  const start = startOfMonth(zoned);
  start.setHours(0, 0, 0, 0);
  return fromZonedTime(start, timezone);
}

export function zonedDayKey(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function weekDaysFrom(weekStart: Date, timezone: string = DEFAULT_TIMEZONE): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatWeekLabel(weekStart: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const weekEnd = addDays(weekStart, 6);
  const startDay = formatInTimeZone(weekStart, timezone, "d");
  const endDay = formatInTimeZone(weekEnd, timezone, "d");
  const startMonth = formatInTimeZone(weekStart, timezone, "MMMM", { locale: es });
  const endMonth = formatInTimeZone(weekEnd, timezone, "MMMM", { locale: es });
  if (startMonth === endMonth) {
    return `${startDay} – ${endDay} de ${startMonth}`;
  }
  return `${startDay} de ${startMonth} – ${endDay} de ${endMonth}`;
}

export function formatMonthLabel(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return capitalizeEs(formatInTimeZone(date, timezone, "MMMM yyyy", { locale: es }));
}

export function formatWeekdayLong(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return capitalizeEs(formatInTimeZone(date, timezone, "EEEE", { locale: es }));
}

export function formatWeekdayShort(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "EEE", { locale: es }).replace(".", "");
}

export function formatDuration(startsAt: string, endsAt: string, allDay: boolean): string {
  if (allDay) return "todo el día";
  const minutes = Math.max(0, Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours ? `${hours} h` : ""}${hours && rest ? " " : ""}${rest ? `${rest} min` : ""}`.trim() || "0 min";
}

export function birthdayMatchesDay(month: number, day: number, dayKey: string): boolean {
  const [, keyMonth, keyDay] = dayKey.split("-").map(Number);
  return keyMonth === month && keyDay === day;
}

export function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

export function localDateAt(dateKey: string, hours: number, minutes = 0): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hours, minutes, 0, 0);
}

export function nextHourStart(from = new Date()): Date {
  const start = new Date(from);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  return start;
}

/** If start is at or after end, end becomes start + 1 hour. */
export function ensureEndsAfterStart(start: Date, end: Date, minDurationMs = 3600000): Date {
  if (end.getTime() > start.getTime()) return end;
  return new Date(start.getTime() + minDurationMs);
}
