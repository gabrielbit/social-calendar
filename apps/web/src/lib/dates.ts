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

export function appUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
