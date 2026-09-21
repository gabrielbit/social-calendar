import {
  CreateEventSchema,
  expandRrule,
  sanitizeHtml,
  slugify,
  type CreateEventInput,
  normalizeContactEmail,
  normalizeInstagramHandle,
  normalizeWhatsAppPhone,
} from "@agenda/domain";
import { z } from "zod";
import { createServiceClient } from "../lib/supabase.js";
import { toOccurrenceDto, type OccurrenceDto } from "../lib/mappers.js";

const UpdateEventSchema = CreateEventSchema.partial().extend({
  editorialStatus: z.enum(["draft", "published", "cancelled"]).optional(),
});

export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

const OCCURRENCE_HORIZON_MONTHS = 12;

export function sanitizeDescriptionHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  return sanitizeHtml(html);
}

function invalidContact(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
}

async function findOrCreateVenue(userId: string, locationLabel: string): Promise<string> {
  const db = createServiceClient();
  const label = locationLabel.trim();
  const name = label.split(",")[0]?.trim() || label;

  const { data: existing } = await db
    .from("venues")
    .select("id")
    .eq("created_by", userId)
    .eq("address", label)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await db
    .from("venues")
    .insert({ name, address: label, created_by: userId })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo guardar el lugar");
  }
  return data.id as string;
}

async function venueIdFromLabel(
  userId: string,
  locationLabel: string | null | undefined,
): Promise<string | null | undefined> {
  if (locationLabel === undefined) return undefined;
  if (!locationLabel || !locationLabel.trim()) return null;
  return findOrCreateVenue(userId, locationLabel);
}

function requiredNormalize<T>(
  raw: string | null | undefined,
  normalize: (value: string | null | undefined) => T | null,
  message: string,
): T | null {
  if (raw === undefined || raw === null || raw.trim() === "") return null;
  const normalized = normalize(raw);
  if (!normalized) throw invalidContact(message);
  return normalized;
}

type ContactPatch = {
  allow_contact: boolean;
  contact_instagram: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  contact_type: "url" | "whatsapp" | "email" | null;
  contact_value: string | null;
};

function legacyContactChannels(contact: CreateEventInput["contact"]): {
  instagram: string | null;
  whatsapp: string | null;
  email: string | null;
} {
  if (!contact) return { instagram: null, whatsapp: null, email: null };
  if (contact.type === "whatsapp") {
    return { instagram: null, whatsapp: normalizeWhatsAppPhone(contact.value), email: null };
  }
  if (contact.type === "email") {
    return { instagram: null, whatsapp: null, email: normalizeContactEmail(contact.value) };
  }
  const instagram = normalizeInstagramHandle(contact.value);
  return { instagram, whatsapp: null, email: null };
}

function toLegacyContact(channels: {
  instagram: string | null;
  whatsapp: string | null;
  email: string | null;
}): { type: "url" | "whatsapp" | "email"; value: string } | { type: null; value: null } {
  if (channels.whatsapp) return { type: "whatsapp", value: channels.whatsapp };
  if (channels.email) return { type: "email", value: channels.email };
  if (channels.instagram) return { type: "url", value: `https://instagram.com/${channels.instagram}` };
  return { type: null, value: null };
}

async function resolveEventContact(
  userId: string,
  input: {
    allowContact?: boolean;
    contactInstagram?: string | null;
    contactWhatsapp?: string | null;
    contactEmail?: string | null;
    contact?: CreateEventInput["contact"];
  },
  opts: { fillFromProfile: boolean },
): Promise<ContactPatch> {
  const db = createServiceClient();
  const { data: profile } = opts.fillFromProfile
    ? await db
        .from("profiles")
        .select("instagram_handle, whatsapp_phone, contact_email, allow_contact")
        .eq("id", userId)
        .maybeSingle()
    : { data: null };

  const allowContact = input.allowContact ?? profile?.allow_contact ?? true;
  const legacy = legacyContactChannels(input.contact);

  const instagram = input.contactInstagram !== undefined
    ? requiredNormalize(input.contactInstagram, normalizeInstagramHandle, "Usuario de Instagram inválido")
    : legacy.instagram;
  const whatsapp = input.contactWhatsapp !== undefined
    ? requiredNormalize(input.contactWhatsapp, normalizeWhatsAppPhone, "WhatsApp inválido. Usá código de país, por ejemplo +54 9 11…")
    : legacy.whatsapp;
  const email = input.contactEmail !== undefined
    ? requiredNormalize(input.contactEmail, normalizeContactEmail, "Email de contacto inválido")
    : legacy.email;

  // El evento hereda el contacto del perfil solo si no declaró ningún canal
  // propio: heredar canal por canal mezclaba ambos contactos en la misma vista.
  const declaredOwnContact = Boolean(instagram || whatsapp || email);
  const inherited = !declaredOwnContact && opts.fillFromProfile && allowContact
    ? {
        instagram: profile?.instagram_handle ?? null,
        whatsapp: profile?.whatsapp_phone ?? null,
        email: profile?.contact_email ?? null,
      }
    : { instagram, whatsapp, email };

  const channels = allowContact
    ? inherited
    : { instagram: null, whatsapp: null, email: null };
  const legacyOut = toLegacyContact(channels);

  return {
    allow_contact: allowContact,
    contact_instagram: channels.instagram,
    contact_whatsapp: channels.whatsapp,
    contact_email: channels.email,
    contact_type: legacyOut.type,
    contact_value: legacyOut.value,
  };
}

export async function createEvent(userId: string, input: CreateEventInput) {
  const db = createServiceClient();
  const parsed = CreateEventSchema.parse(input);

  const { data: agenda, error: agendaError } = await db
    .from("agendas")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  if (agendaError || !agenda) {
    throw new Error(agendaError?.message ?? "Primary agenda not found");
  }

  const slug = parsed.slug ?? slugify(parsed.title);
  const descriptionHtml = sanitizeDescriptionHtml(parsed.descriptionHtml);
  const startsAt = new Date(parsed.startsAt);
  const endsAt = new Date(parsed.endsAt);
  const horizonEnd = new Date(startsAt);
  horizonEnd.setUTCMonth(horizonEnd.getUTCMonth() + OCCURRENCE_HORIZON_MONTHS);
  const contact = await resolveEventContact(userId, parsed, { fillFromProfile: true });
  const venueId =
    parsed.venueId !== undefined && parsed.venueId !== null
      ? parsed.venueId
      : ((await venueIdFromLabel(userId, parsed.locationLabel)) ?? null);

  const { data: event, error: eventError } = await db
    .from("events")
    .insert({
      author_id: userId,
      agenda_id: agenda.id,
      slug,
      title: parsed.title,
      description_html: descriptionHtml,
      visibility: parsed.visibility ?? "shared",
      editorial_status: parsed.editorialStatus,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt,
      all_day: parsed.allDay,
      timezone: parsed.timezone,
      rrule: parsed.rrule ?? null,
      location_mode: parsed.locationMode,
      venue_id: venueId,
      online_url: parsed.onlineUrl ?? null,
      site_url: parsed.siteUrl ?? null,
      tickets_url: parsed.ticketsUrl ?? null,
      is_free: parsed.isFree,
      price_label: parsed.priceLabel ?? null,
      ticket_deadline_at: parsed.ticketDeadlineAt ?? null,
      ...contact,
      capacity: parsed.capacity ?? null,
      language: parsed.language,
      age_restriction: parsed.ageRestriction ?? null,
      accessibility_notes: parsed.accessibilityNotes ?? null,
      cover_image_url: parsed.coverImageUrl ?? null,
      gallery_urls: parsed.galleryUrls,
      linked_birthday: parsed.linkedBirthday,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message ?? "Failed to create event");
  }

  const seeds = expandRrule({
    startsAt,
    endsAt,
    rrule: parsed.rrule,
    horizonEnd,
    allDay: parsed.allDay,
    timezone: parsed.timezone,
  });

  const occurrenceRows = seeds.map((seed) => ({
    event_id: event.id,
    starts_at: seed.startsAt.toISOString(),
    ends_at: seed.endsAt.toISOString(),
    all_day: seed.allDay,
    timezone: seed.timezone,
    is_exception: seed.isException ?? false,
    cancelled: seed.cancelled ?? false,
  }));

  const { data: occurrences, error: occError } = await db
    .from("event_occurrences")
    .insert(occurrenceRows)
    .select("*");

  if (occError) {
    throw new Error(occError.message);
  }

  if (parsed.tagSlugs.length > 0) {
    await attachTags(event.id, parsed.tagSlugs);
  }

  return {
    event: mapEvent(event),
    occurrences: (occurrences ?? []).map(mapOccurrence),
  };
}

export async function updateEvent(userId: string, eventId: string, input: UpdateEventInput) {
  const db = createServiceClient();
  const parsed = UpdateEventSchema.parse(input);

  const { data: existing, error: existingError } = await db
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("author_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Event not found");

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.slug !== undefined) patch.slug = parsed.slug;
  if (parsed.descriptionHtml !== undefined) {
    patch.description_html = sanitizeDescriptionHtml(parsed.descriptionHtml);
  }
  if (parsed.visibility !== undefined) patch.visibility = parsed.visibility;
  if (parsed.editorialStatus !== undefined) patch.editorial_status = parsed.editorialStatus;
  if (parsed.startsAt !== undefined) patch.starts_at = parsed.startsAt;
  if (parsed.endsAt !== undefined) patch.ends_at = parsed.endsAt;
  if (parsed.allDay !== undefined) patch.all_day = parsed.allDay;
  if (parsed.timezone !== undefined) patch.timezone = parsed.timezone;
  if (parsed.rrule !== undefined) patch.rrule = parsed.rrule;
  if (parsed.locationMode !== undefined) patch.location_mode = parsed.locationMode;
  if (parsed.locationLabel !== undefined) {
    patch.venue_id = (await venueIdFromLabel(userId, parsed.locationLabel)) ?? null;
  } else if (parsed.venueId !== undefined) {
    patch.venue_id = parsed.venueId;
  }
  if (parsed.onlineUrl !== undefined) patch.online_url = parsed.onlineUrl;
  if (parsed.siteUrl !== undefined) patch.site_url = parsed.siteUrl;
  if (parsed.ticketsUrl !== undefined) patch.tickets_url = parsed.ticketsUrl;
  if (parsed.isFree !== undefined) patch.is_free = parsed.isFree;
  if (parsed.priceLabel !== undefined) patch.price_label = parsed.priceLabel;
  if (parsed.ticketDeadlineAt !== undefined) patch.ticket_deadline_at = parsed.ticketDeadlineAt;
  if (
    parsed.allowContact !== undefined ||
    parsed.contactInstagram !== undefined ||
    parsed.contactWhatsapp !== undefined ||
    parsed.contactEmail !== undefined ||
    parsed.contact !== undefined
  ) {
    Object.assign(
      patch,
      await resolveEventContact(userId, parsed, { fillFromProfile: false }),
    );
  }
  if (parsed.capacity !== undefined) patch.capacity = parsed.capacity;
  if (parsed.language !== undefined) patch.language = parsed.language;
  if (parsed.ageRestriction !== undefined) patch.age_restriction = parsed.ageRestriction;
  if (parsed.accessibilityNotes !== undefined) patch.accessibility_notes = parsed.accessibilityNotes;
  if (parsed.coverImageUrl !== undefined) patch.cover_image_url = parsed.coverImageUrl;
  if (parsed.galleryUrls !== undefined) patch.gallery_urls = parsed.galleryUrls;
  if (parsed.linkedBirthday !== undefined) patch.linked_birthday = parsed.linkedBirthday;

  const { data: event, error } = await db.from("events").update(patch).eq("id", eventId).select("*").single();
  if (error || !event) throw new Error(error?.message ?? "Failed to update event");

  if (parsed.tagSlugs) {
    await db.from("event_tags").delete().eq("event_id", eventId);
    if (parsed.tagSlugs.length > 0) {
      await attachTags(eventId, parsed.tagSlugs);
    }
  }

  const shouldRebuildOccurrences =
    parsed.startsAt !== undefined ||
    parsed.endsAt !== undefined ||
    parsed.rrule !== undefined ||
    parsed.allDay !== undefined ||
    parsed.timezone !== undefined;

  if (shouldRebuildOccurrences) {
    await db.from("event_occurrences").delete().eq("event_id", eventId).eq("is_exception", false);

    const startsAt = new Date(String(event.starts_at));
    const endsAt = new Date(String(event.ends_at));
    const horizonEnd = new Date(startsAt);
    horizonEnd.setUTCMonth(horizonEnd.getUTCMonth() + OCCURRENCE_HORIZON_MONTHS);

    const seeds = expandRrule({
      startsAt,
      endsAt,
      rrule: event.rrule,
      horizonEnd,
      allDay: Boolean(event.all_day),
      timezone: String(event.timezone),
    });

    const { error: rebuildError } = await db.from("event_occurrences").insert(
      seeds.map((seed) => ({
        event_id: eventId,
        starts_at: seed.startsAt.toISOString(),
        ends_at: seed.endsAt.toISOString(),
        all_day: seed.allDay,
        timezone: seed.timezone,
      })),
    );
    if (rebuildError) throw new Error(rebuildError.message);
  }

  const { data: occurrences } = await db
    .from("event_occurrences")
    .select("*")
    .eq("event_id", eventId)
    .order("starts_at", { ascending: true });

  return {
    event: mapEvent(event),
    occurrences: (occurrences ?? []).map(mapOccurrence),
  };
}

export async function cancelOccurrence(userId: string, occurrenceId: string) {
  const db = createServiceClient();

  const { data: occurrence, error: occError } = await db
    .from("event_occurrences")
    .select("*, events!inner(author_id)")
    .eq("id", occurrenceId)
    .maybeSingle();

  if (occError) throw new Error(occError.message);
  if (!occurrence) throw new Error("Occurrence not found");

  const authorId = (occurrence.events as { author_id: string }).author_id;
  if (authorId !== userId) throw new Error("Forbidden");

  const { data, error } = await db
    .from("event_occurrences")
    .update({ cancelled: true })
    .eq("id", occurrenceId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to cancel occurrence");
  return mapOccurrence(data);
}

export async function listAgendaOccurrences(opts: {
  agendaId: string;
  from: string;
  to: string;
  viewerId?: string;
}): Promise<OccurrenceDto[]> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("agenda_occurrences", {
    p_agenda_id: opts.agendaId,
    p_from: opts.from,
    p_to: opts.to,
    p_viewer: opts.viewerId ?? null,
  });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => toOccurrenceDto(row));
}

async function attachTags(eventId: string, tagSlugs: string[]) {
  const db = createServiceClient();
  const { data: tags, error } = await db.from("tags").select("id, slug").in("slug", tagSlugs);
  if (error) throw new Error(error.message);

  const rows = (tags ?? []).map((tag) => ({
    event_id: eventId,
    tag_id: tag.id,
  }));

  if (rows.length === 0) return;

  const { error: insertError } = await db.from("event_tags").insert(rows);
  if (insertError) throw new Error(insertError.message);
}

function mapEvent(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    authorId: String(row.author_id),
    agendaId: String(row.agenda_id),
    slug: String(row.slug),
    title: String(row.title),
    descriptionHtml: row.description_html ? String(row.description_html) : null,
    visibility: String(row.visibility),
    editorialStatus: String(row.editorial_status),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    allDay: Boolean(row.all_day),
    timezone: String(row.timezone),
    rrule: row.rrule ? String(row.rrule) : null,
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : null,
    allowContact: row.allow_contact !== false,
    contactInstagram: row.contact_instagram ? String(row.contact_instagram) : null,
    contactWhatsapp: row.contact_whatsapp ? String(row.contact_whatsapp) : null,
    contactEmail: row.contact_email ? String(row.contact_email) : null,
  };
}

function mapOccurrence(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    allDay: Boolean(row.all_day),
    timezone: String(row.timezone),
    cancelled: Boolean(row.cancelled),
    isException: Boolean(row.is_exception),
  };
}
