/**
 * Minimal ICS VEVENT parser for cold-start import.
 * Supports SUMMARY, DESCRIPTION, DTSTART, DTEND, LOCATION, RRULE, UID.
 */
export type ParsedIcsEvent = {
  uid?: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  rrule?: string;
};

export function parseIcs(icsText: string): ParsedIcsEvent[] {
  const normalized = icsText.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n");
  const blocks = normalized.split("BEGIN:VEVENT").slice(1);
  const events: ParsedIcsEvent[] = [];

  for (const block of blocks) {
    const body = block.split("END:VEVENT")[0] ?? "";
    const get = (key: string) => {
      const re = new RegExp(`^${key}[^:]*:(.*)$`, "im");
      return re.exec(body)?.[1]?.trim();
    };
    const title = get("SUMMARY");
    const dtStartLine = /^DTSTART([^:]*):(.*)$/im.exec(body);
    const dtEndLine = /^DTEND([^:]*):(.*)$/im.exec(body);
    if (!title || !dtStartLine) continue;

    const startRaw = dtStartLine[2]!.trim();
    const endRaw = dtEndLine?.[2]?.trim();
    const allDay = /VALUE=DATE/i.test(dtStartLine[1] ?? "") || /^\d{8}$/.test(startRaw);
    const startsAt = parseIcsDateTime(startRaw, allDay);
    const endsAt = endRaw
      ? parseIcsDateTime(endRaw, allDay)
      : new Date(startsAt.getTime() + (allDay ? 86400000 : 3600000));

    events.push({
      uid: get("UID"),
      title: unescapeIcs(title),
      description: get("DESCRIPTION") ? unescapeIcs(get("DESCRIPTION")!) : undefined,
      location: get("LOCATION") ? unescapeIcs(get("LOCATION")!) : undefined,
      startsAt,
      endsAt,
      allDay,
      rrule: get("RRULE"),
    });
  }
  return events;
}

function parseIcsDateTime(value: string, allDay: boolean): Date {
  if (allDay || /^\d{8}$/.test(value)) {
    return new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8))));
  }
  const v = value.replace(/[-:]/g, "");
  const y = Number(v.slice(0, 4));
  const m = Number(v.slice(4, 6)) - 1;
  const d = Number(v.slice(6, 8));
  const hh = Number(v.slice(9, 11) || 0);
  const mm = Number(v.slice(11, 13) || 0);
  const ss = Number(v.slice(13, 15) || 0);
  if (value.endsWith("Z") || v.includes("Z")) return new Date(Date.UTC(y, m, d, hh, mm, ss));
  return new Date(Date.UTC(y, m, d, hh, mm, ss));
}

function unescapeIcs(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

/** Heuristic flyer text → draft event fields (human must confirm). */
export function parseFlyerText(text: string): {
  title?: string;
  description?: string;
  startsAtHint?: string;
  locationHint?: string;
  ticketsUrl?: string;
  siteUrl?: string;
  tagHints: string[];
} {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const title = lines[0]?.slice(0, 200);
  const urlRe = /https?:\/\/[^\s)]+/gi;
  const urls = text.match(urlRe) ?? [];
  const ticketsUrl = urls.find((u) => /ticket|entrada|passline|eventbrite|pass/i.test(u));
  const siteUrl = urls.find((u) => u !== ticketsUrl);
  const dateHint =
    text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/)?.[1] ??
    text.match(/\b(\d{1,2}\s+de\s+\w+\b.*?\d{0,4})/i)?.[1];
  const locationHint =
    text.match(/(?:en|lugar|venue)[:\s]+([^\n.]{3,80})/i)?.[1]?.trim() ??
    text.match(/@\s*([^\n,]{3,80})/)?.[1]?.trim();
  const tagHints: string[] = [];
  for (const t of ["yoga", "pilates", "fiesta", "baila", "techno", "jazz", "teatro", "charla", "taller"]) {
    if (new RegExp(t, "i").test(text)) tagHints.push(t);
  }
  return {
    title,
    description: lines.slice(1).join("\n").slice(0, 4000) || undefined,
    startsAtHint: dateHint,
    locationHint,
    ticketsUrl,
    siteUrl,
    tagHints,
  };
}
