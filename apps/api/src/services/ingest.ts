import { parseFlyerText, parseIcs, DEFAULT_TIMEZONE } from "@agenda/domain";
import { z } from "zod";

const ImportIcsSchema = z.object({
  icsText: z.string().min(1).optional(),
  icsUrl: z.string().url().optional(),
}).refine((value) => Boolean(value.icsText || value.icsUrl), {
  message: "Provide icsText or icsUrl",
});

const ParseFlyerSchema = z.object({
  text: z.string().min(1).max(20_000),
});

export type EventDraft = {
  uid?: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  rrule?: string;
  timezone: string;
  editorialStatus: "draft";
};

export async function importIcs(input: z.infer<typeof ImportIcsSchema>): Promise<{ drafts: EventDraft[] }> {
  const parsed = ImportIcsSchema.parse(input);
  let icsText = parsed.icsText;

  if (!icsText && parsed.icsUrl) {
    const response = await fetch(parsed.icsUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ICS URL (${response.status})`);
    }
    icsText = await response.text();
  }

  if (!icsText) throw new Error("ICS content is empty");

  const events = parseIcs(icsText);
  const drafts: EventDraft[] = events.map((event) => ({
    uid: event.uid,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    allDay: event.allDay,
    rrule: event.rrule,
    timezone: DEFAULT_TIMEZONE,
    editorialStatus: "draft",
  }));

  return { drafts };
}

export function parseFlyer(input: z.infer<typeof ParseFlyerSchema>) {
  const parsed = ParseFlyerSchema.parse(input);
  const hints = parseFlyerText(parsed.text);

  return {
    draft: {
      title: hints.title,
      description: hints.description,
      startsAtHint: hints.startsAtHint,
      locationHint: hints.locationHint,
      ticketsUrl: hints.ticketsUrl,
      siteUrl: hints.siteUrl,
      tagHints: hints.tagHints,
      editorialStatus: "draft" as const,
    },
  };
}
