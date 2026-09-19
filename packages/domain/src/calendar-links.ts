export type CalendarEventPayload = {
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  timezone?: string;
  url?: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function formatAllDay(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Google Calendar template URL (official prefilled event link). */
export function buildGoogleCalendarUrl(event: CalendarEventPayload): string {
  const dates = event.allDay
    ? `${formatAllDay(event.startsAt)}/${formatAllDay(new Date(event.endsAt.getTime() + 86400000))}`
    : `${formatUtc(event.startsAt)}/${formatUtc(event.endsAt)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  if (event.timezone) {
    params.set("stz", event.timezone);
    params.set("etz", event.timezone);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** RFC5545 ICS body for Outlook/Apple download. */
export function buildIcs(event: CalendarEventPayload, uid: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agenda Comunidad//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatUtc(new Date())}`,
  ];
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatAllDay(event.startsAt)}`);
    lines.push(`DTEND;VALUE=DATE:${formatAllDay(new Date(event.endsAt.getTime() + 86400000))}`);
  } else {
    lines.push(`DTSTART:${formatUtc(event.startsAt)}`);
    lines.push(`DTEND:${formatUtc(event.endsAt)}`);
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function buildWhatsAppShareUrl(opts: {
  name: string;
  dateLabel: string;
  timeLabel?: string;
  url: string;
}): string {
  const parts = [opts.name, opts.dateLabel];
  if (opts.timeLabel) parts.push(opts.timeLabel);
  parts.push(opts.url);
  return `https://wa.me/?text=${encodeURIComponent(parts.join("\n"))}`;
}
