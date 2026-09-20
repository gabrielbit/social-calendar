import { format, formatInTimeZone } from "date-fns-tz";
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
