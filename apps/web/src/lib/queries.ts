import { createClient } from "@/lib/supabase/server";
import type {
  AgendaOccurrence,
  ExploreResult,
  HomeCalendarData,
  HomeCalendarEvent,
  HomePersonalEvent,
  NetworkBirthday,
  OccurrenceDetail,
  ProfilePublic,
  Tag,
} from "@/lib/types";

export async function getFeaturedTags(limit = 12): Promise<Tag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id, slug, name").limit(limit);
  return (data ?? []) as Tag[];
}

export async function getProfileBySlug(slug: string): Promise<ProfilePublic | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as ProfilePublic | null;
}

export async function getPrimaryAgendaId(ownerId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agendas")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("is_primary", true)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getAgendaOccurrences(
  agendaId: string,
  from: string,
  to: string,
): Promise<AgendaOccurrence[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("agenda_occurrences", {
    p_agenda_id: agendaId,
    p_from: from,
    p_to: to,
  });
  return (data ?? []) as AgendaOccurrence[];
}

export async function getOccurrenceDetail(
  occurrenceId: string,
): Promise<OccurrenceDetail | null> {
  const supabase = await createClient();
  const { data: occurrence } = await supabase
    .from("event_occurrences")
    .select(
      `
      id, event_id, starts_at, ends_at, all_day, timezone, cancelled,
      event:events (
        id, slug, title, description_html, visibility, editorial_status,
        location_mode, online_url, site_url, tickets_url, is_free, price_label,
        cover_image_url, gallery_urls, author_id, timezone, allow_contact,
        contact_instagram, contact_whatsapp, contact_email,
        contact_type, contact_value,
        author:profiles!events_author_id_fkey ( id, slug, display_name, avatar_url ),
        venue:venues ( name, address, zone, city ),
        event_tags ( tag:tags ( id, slug, name ) )
      )
    `,
    )
    .eq("id", occurrenceId)
    .maybeSingle();

  if (!occurrence?.event) return null;

  const raw = occurrence as Record<string, unknown>;
  const nestedEvent = Array.isArray(raw.event) ? raw.event[0] : raw.event;
  const eventRaw = nestedEvent as Record<string, unknown>;
  const eventTags = (eventRaw.event_tags as Array<{ tag: Tag }> | undefined) ?? [];
  const authorRaw = eventRaw.author;
  const author = (Array.isArray(authorRaw) ? authorRaw[0] : authorRaw) as OccurrenceDetail["event"]["author"];
  const venueRaw = eventRaw.venue;

  return {
    id: raw.id as string,
    event_id: raw.event_id as string,
    starts_at: raw.starts_at as string,
    ends_at: raw.ends_at as string,
    all_day: raw.all_day as boolean,
    timezone: raw.timezone as string,
    cancelled: raw.cancelled as boolean,
    event: {
      ...(eventRaw as OccurrenceDetail["event"]),
      id: String(eventRaw.id),
      author_id: String(eventRaw.author_id ?? ""),
      gallery_urls: Array.isArray(eventRaw.gallery_urls) ? (eventRaw.gallery_urls as string[]) : [],
      tags: eventTags.map((et) => et.tag).filter(Boolean),
      author,
      venue: ((Array.isArray(venueRaw) ? venueRaw[0] : venueRaw) as OccurrenceDetail["event"]["venue"]) ?? null,
    },
  };
}

export async function getEventForEdit(eventId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(
      `
      id, title, description_html, visibility, starts_at, ends_at, all_day, rrule,
      site_url, tickets_url, is_free, linked_birthday, cover_image_url, gallery_urls,
      allow_contact, contact_instagram, contact_whatsapp, contact_email, author_id,
      venue:venues ( name, address ),
      event_tags ( tag:tags ( slug ) )
    `,
    )
    .eq("id", eventId)
    .eq("author_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;

  const tags = ((data.event_tags as unknown as Array<{ tag: { slug: string } | null }> | null) ?? [])
    .map((row) => row.tag?.slug)
    .filter(Boolean)
    .join(", ");

  const venueRaw = data.venue as { name: string | null; address: string | null } | { name: string | null; address: string | null }[] | null;
  const venue = Array.isArray(venueRaw) ? venueRaw[0] : venueRaw;

  const images = [
    data.cover_image_url as string | null,
    ...((data.gallery_urls as string[] | null) ?? []),
  ].filter((url): url is string => Boolean(url));

  return {
    id: data.id as string,
    title: data.title as string,
    description: (data.description_html as string | null) ?? "",
    visibility: data.visibility as string,
    startsAt: data.starts_at as string,
    endsAt: data.ends_at as string,
    allDay: Boolean(data.all_day),
    rrule: (data.rrule as string | null) ?? "",
    locationLabel: [venue?.name, venue?.address].filter(Boolean).join(", "),
    siteUrl: (data.site_url as string | null) ?? "",
    ticketsUrl: (data.tickets_url as string | null) ?? "",
    isFree: Boolean(data.is_free),
    linkedBirthday: Boolean(data.linked_birthday),
    tags,
    images,
    allowContact: data.allow_contact !== false,
    instagram: (data.contact_instagram as string | null) ?? "",
    whatsapp: (data.contact_whatsapp as string | null) ?? "",
    email: (data.contact_email as string | null) ?? "",
  };
}

export async function exploreOccurrences(opts: {
  from?: string;
  to?: string;
  tag?: string;
  zone?: string;
  limit?: number;
}): Promise<ExploreResult[]> {
  const supabase = await createClient();
  const from = opts.from ?? new Date().toISOString();
  const to =
    opts.to ?? new Date(Date.now() + 90 * 86400000).toISOString();
  const limit = opts.limit ?? 40;

  const query = supabase
    .from("event_occurrences")
    .select(
      `
      id, starts_at, ends_at, all_day, timezone,
      event:events!inner (
        title, cover_image_url, editorial_status, visibility, deleted_at,
        author:profiles!events_author_id_fkey ( slug, display_name ),
        venue:venues ( zone ),
        event_tags ( tag:tags ( slug ) )
      )
    `,
    )
    .eq("cancelled", false)
    .gte("starts_at", from)
    .lte("starts_at", to)
    .eq("event.editorial_status", "published")
    .in("event.visibility", ["shared", "public"])
    .is("event.deleted_at", null)
    .order("starts_at", { ascending: true })
    .limit(limit);

  const { data } = await query;

  let results: ExploreResult[] = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const event = r.event as Record<string, unknown>;
    const author = event.author as { slug: string; display_name: string };
    const venue = event.venue as { zone: string | null } | null;
    const eventTags =
      (event.event_tags as Array<{ tag: { slug: string } }> | undefined) ?? [];
    return {
      occurrence_id: r.id as string,
      title: event.title as string,
      starts_at: r.starts_at as string,
      ends_at: r.ends_at as string,
      all_day: r.all_day as boolean,
      timezone: r.timezone as string,
      cover_image_url: (event.cover_image_url as string | null) ?? null,
      author_slug: author.slug,
      author_name: author.display_name,
      zone: venue?.zone ?? null,
      tag_slugs: eventTags.map((t) => t.tag.slug),
    };
  });

  if (opts.tag) {
    results = results.filter((r) => r.tag_slugs.includes(opts.tag!));
  }
  if (opts.zone) {
    const z = opts.zone.toLowerCase();
    results = results.filter((r) => r.zone?.toLowerCase().includes(z));
  }

  return results;
}

export async function getNetworkBirthdays(): Promise<NetworkBirthday[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("network_birthdays");
  return (data ?? []) as NetworkBirthday[];
}

export async function getFollowingOccurrences(
  userId: string,
  from: string,
  to: string,
): Promise<ExploreResult[]> {
  const supabase = await createClient();
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followingIds = (follows ?? []).map((f) => f.following_id);
  if (followingIds.length === 0) return [];

  const { data } = await supabase
    .from("event_occurrences")
    .select(
      `
      id, starts_at, ends_at, all_day, timezone,
      event:events!inner (
        title, cover_image_url, author_id,
        author:profiles!events_author_id_fkey ( slug, display_name ),
        venue:venues ( zone ),
        event_tags ( tag:tags ( slug ) )
      )
    `,
    )
    .eq("cancelled", false)
    .gte("starts_at", from)
    .lte("starts_at", to)
    .in("event.author_id", followingIds)
    .eq("event.editorial_status", "published")
    .in("event.visibility", ["shared", "public"])
    .is("event.deleted_at", null)
    .order("starts_at", { ascending: true });

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const event = r.event as Record<string, unknown>;
    const author = event.author as { slug: string; display_name: string };
    const venue = event.venue as { zone: string | null } | null;
    const eventTags =
      (event.event_tags as Array<{ tag: { slug: string } }> | undefined) ?? [];
    return {
      occurrence_id: r.id as string,
      title: event.title as string,
      starts_at: r.starts_at as string,
      ends_at: r.ends_at as string,
      all_day: r.all_day as boolean,
      timezone: r.timezone as string,
      cover_image_url: (event.cover_image_url as string | null) ?? null,
      author_slug: author.slug,
      author_name: author.display_name,
      zone: venue?.zone ?? null,
      tag_slugs: eventTags.map((t) => t.tag.slug),
    };
  });
}

export async function getGoingOccurrences(
  userId: string,
  from: string,
  to: string,
): Promise<ExploreResult[]> {
  const supabase = await createClient();
  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("occurrence_id")
    .eq("user_id", userId)
    .eq("status", "going");

  const ids = (rsvps ?? []).map((r) => r.occurrence_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("event_occurrences")
    .select(
      `
      id, starts_at, ends_at, all_day, timezone,
      event:events!inner (
        title, cover_image_url,
        author:profiles!events_author_id_fkey ( slug, display_name ),
        venue:venues ( zone ),
        event_tags ( tag:tags ( slug ) )
      )
    `,
    )
    .in("id", ids)
    .eq("cancelled", false)
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at", { ascending: true });

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const event = r.event as Record<string, unknown>;
    const author = event.author as { slug: string; display_name: string };
    const venue = event.venue as { zone: string | null } | null;
    const eventTags =
      (event.event_tags as Array<{ tag: { slug: string } }> | undefined) ?? [];
    return {
      occurrence_id: r.id as string,
      title: event.title as string,
      starts_at: r.starts_at as string,
      ends_at: r.ends_at as string,
      all_day: r.all_day as boolean,
      timezone: r.timezone as string,
      cover_image_url: (event.cover_image_url as string | null) ?? null,
      author_slug: author.slug,
      author_name: author.display_name,
      zone: venue?.zone ?? null,
      tag_slugs: eventTags.map((t) => t.tag.slug),
    };
  });
}

export async function getSitemapProfiles(): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles_public")
    .select("slug, created_at")
    .limit(5000);
  return (data ?? []).map((p) => ({
    slug: p.slug,
    updated_at: p.created_at,
  }));
}

export async function getSitemapOccurrences(): Promise<
  { id: string; starts_at: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_occurrences")
    .select(
      `
      id, starts_at,
      event:events!inner ( editorial_status, visibility, deleted_at )
    `,
    )
    .eq("cancelled", false)
    .gte("starts_at", new Date().toISOString())
    .eq("event.editorial_status", "published")
    .in("event.visibility", ["shared", "public"])
    .is("event.deleted_at", null)
    .order("starts_at", { ascending: true })
    .limit(5000);

  return (data ?? []).map((o) => ({
    id: (o as { id: string }).id,
    starts_at: (o as { starts_at: string }).starts_at,
  }));
}

export async function getProfileSocialStats(profileId: string): Promise<{
  followers: number;
  republishers: number;
}> {
  const supabase = await createClient();
  const [{ count: followers }, { count: republishers }] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profileId),
    supabase
      .from("agenda_sources")
      .select("id", { count: "exact", head: true })
      .eq("source_profile_id", profileId)
      .eq("enabled", true),
  ]);
  return { followers: followers ?? 0, republishers: republishers ?? 0 };
}

export async function getIsFollowing(
  profileId: string,
  viewerId: string | undefined,
): Promise<boolean> {
  if (!viewerId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("following_id", profileId)
    .maybeSingle();
  return Boolean(data);
}

const HOME_OCCURRENCE_SELECT = `
  id, starts_at, ends_at, all_day, timezone,
  event:events!inner (
    title, cover_image_url, is_free, price_label, site_url, visibility, author_id,
    editorial_status, deleted_at,
    author:profiles!events_author_id_fkey ( slug, display_name ),
    venue:venues ( name, zone ),
    event_tags ( tag:tags ( slug ) )
  )
`;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapHomeRows(data: unknown, goingIds: Set<string>): HomeCalendarEvent[] {
  return (Array.isArray(data) ? data : []).flatMap((raw) => {
    const row = raw as Record<string, unknown>;
    const event = first(row.event as Record<string, unknown> | Record<string, unknown>[] | null);
    if (!event) return [];
    const author = first(event.author as { slug: string; display_name: string } | { slug: string; display_name: string }[] | null);
    if (!author) return [];
    const venue = first(event.venue as { name: string | null; zone: string | null } | { name: string | null; zone: string | null }[] | null);
    const eventTags = (event.event_tags as Array<{ tag: { slug: string } }> | undefined) ?? [];
    const id = row.id as string;
    const place = [venue?.name, venue?.zone].filter(Boolean).join(" · ") || venue?.zone || null;
    return [
      {
        occurrence_id: id,
        title: event.title as string,
        starts_at: row.starts_at as string,
        ends_at: row.ends_at as string,
        all_day: row.all_day as boolean,
        timezone: row.timezone as string,
        cover_image_url: (event.cover_image_url as string | null) ?? null,
        author_slug: author.slug,
        author_name: author.display_name,
        zone: venue?.zone ?? null,
        tag_slugs: eventTags.map((item) => item.tag.slug),
        venue_name: venue?.name ?? null,
        place,
        price_label: event.is_free ? "gratis" : ((event.price_label as string | null) ?? null),
        is_free: Boolean(event.is_free),
        site_url: (event.site_url as string | null) ?? null,
        going: goingIds.has(id),
      },
    ];
  });
}

function mapPersonalRows(data: unknown): HomePersonalEvent[] {
  return (Array.isArray(data) ? data : []).flatMap((raw) => {
    const row = raw as Record<string, unknown>;
    const event = first(row.event as Record<string, unknown> | Record<string, unknown>[] | null);
    if (!event) return [];
    return [
      {
        occurrence_id: row.id as string,
        title: event.title as string,
        starts_at: row.starts_at as string,
        ends_at: row.ends_at as string,
        all_day: row.all_day as boolean,
        timezone: row.timezone as string,
      },
    ];
  });
}

export async function getHomeCalendar(userId: string): Promise<HomeCalendarData> {
  const supabase = await createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setMonth(to.getMonth() + 4);
  to.setDate(0);
  to.setHours(23, 59, 59, 999);

  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const [followsRes, rsvpsRes, birthdays, calendarConn] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase.from("event_rsvps").select("occurrence_id").eq("user_id", userId).eq("status", "going"),
    getNetworkBirthdays(),
    supabase
      .from("calendar_connections")
      .select("status")
      .eq("user_id", userId)
      .eq("provider", "google")
      .maybeSingle(),
  ]);

  const followingIds = (followsRes.data ?? []).map((row) => row.following_id as string);
  const goingIds = new Set((rsvpsRes.data ?? []).map((row) => row.occurrence_id as string));
  const authorIds = [...new Set([...followingIds, userId])];

  const culturalQuery = supabase
    .from("event_occurrences")
    .select(HOME_OCCURRENCE_SELECT)
    .eq("cancelled", false)
    .gte("starts_at", fromIso)
    .lte("starts_at", toIso)
    .in("event.author_id", authorIds)
    .eq("event.editorial_status", "published")
    .in("event.visibility", ["shared", "public"])
    .is("event.deleted_at", null)
    .order("starts_at", { ascending: true });

  const personalQuery = supabase
    .from("event_occurrences")
    .select(HOME_OCCURRENCE_SELECT)
    .eq("cancelled", false)
    .gte("starts_at", fromIso)
    .lte("starts_at", toIso)
    .eq("event.author_id", userId)
    .eq("event.visibility", "private")
    .is("event.deleted_at", null)
    .order("starts_at", { ascending: true });

  const goingQuery =
    goingIds.size > 0
      ? supabase
          .from("event_occurrences")
          .select(HOME_OCCURRENCE_SELECT)
          .in("id", [...goingIds])
          .eq("cancelled", false)
          .gte("starts_at", fromIso)
          .lte("starts_at", toIso)
          .order("starts_at", { ascending: true })
      : Promise.resolve({ data: [] });

  const [culturalRes, personalRes, goingRes] = await Promise.all([
    culturalQuery,
    personalQuery,
    goingQuery,
  ]);

  const byId = new Map<string, HomeCalendarEvent>();
  for (const event of mapHomeRows(culturalRes.data, goingIds)) {
    byId.set(event.occurrence_id, event);
  }
  for (const event of mapHomeRows(goingRes.data, goingIds)) {
    const existing = byId.get(event.occurrence_id);
    if (existing) existing.going = true;
    else byId.set(event.occurrence_id, { ...event, going: true });
  }

  return {
    events: [...byId.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    personal: mapPersonalRows(personalRes.data),
    birthdays,
    googleConnected: calendarConn.data?.status === "active",
  };
}
