import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../sanitize.js";
import { expandRrule, resolveBirthdayDate, isLeapYear } from "../recurrence.js";
import { buildGoogleCalendarUrl, buildIcs, buildWhatsAppShareUrl } from "../calendar-links.js";
import { parseIcs, parseFlyerText } from "../ingest.js";

describe("sanitizeHtml", () => {
  it("strips scripts and event handlers", () => {
    const out = sanitizeHtml(`<p onclick="alert(1)">Hola</p><script>evil()</script><a href="javascript:alert(1)">x</a>`);
    expect(out).toContain("<p>Hola</p>");
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("javascript:");
  });

  it("keeps safe links", () => {
    const out = sanitizeHtml(`<a href="https://example.com">ok</a>`);
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});

describe("recurrence", () => {
  it("expands weekly rrule", () => {
    const startsAt = new Date("2026-09-21T15:00:00Z");
    const endsAt = new Date("2026-09-21T16:00:00Z");
    const horizonEnd = new Date("2026-10-20T00:00:00Z");
    const occ = expandRrule({
      startsAt,
      endsAt,
      rrule: "FREQ=WEEKLY;INTERVAL=1",
      horizonEnd,
    });
    expect(occ.length).toBeGreaterThanOrEqual(4);
    expect(occ[0]!.startsAt.toISOString()).toBe(startsAt.toISOString());
  });

  it("resolves feb 29 on non-leap years", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(resolveBirthdayDate(2025, 2, 29).getUTCDate()).toBe(28);
    expect(resolveBirthdayDate(2024, 2, 29).getUTCDate()).toBe(29);
  });
});

describe("calendar links", () => {
  const event = {
    title: "Yoga en el parque",
    startsAt: new Date("2026-09-21T15:00:00Z"),
    endsAt: new Date("2026-09-21T16:00:00Z"),
    description: "Traer mat",
    location: "Palermo",
    timezone: "America/Argentina/Buenos_Aires",
    url: "https://agenda.example/e/1",
  };

  it("builds google url", () => {
    const url = buildGoogleCalendarUrl(event);
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("Yoga");
  });

  it("builds ics", () => {
    const ics = buildIcs(event, "occ-1@agenda");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Yoga en el parque");
  });

  it("builds whatsapp share", () => {
    const url = buildWhatsAppShareUrl({
      name: "Yoga",
      dateLabel: "21 sep",
      timeLabel: "12:00",
      url: "https://agenda.example/e/1",
    });
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
  });
});

describe("ingest", () => {
  it("parses ics events", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:1@test
SUMMARY:Milonga
DTSTART:20260921T220000Z
DTEND:20260922T020000Z
LOCATION:San Telmo
END:VEVENT
END:VCALENDAR`;
    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0]!.title).toBe("Milonga");
    expect(events[0]!.location).toBe("San Telmo");
  });

  it("parses flyer text hints", () => {
    const draft = parseFlyerText(`Clase de Yoga\nSábado 20/09/2026 en Palermo\nEntradas https://passline.com/x\n#yoga`);
    expect(draft.title).toContain("Yoga");
    expect(draft.tagHints).toContain("yoga");
    expect(draft.ticketsUrl).toContain("passline");
  });
});
