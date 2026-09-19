import { AgendaSourceSchema, type AgendaSourceInput } from "@agenda/domain";
import { z } from "zod";
import { createServiceClient } from "../lib/supabase.js";

const PinEventSchema = z.object({
  agendaId: z.string().uuid(),
  eventId: z.string().uuid(),
  pinType: z.enum(["include", "exclude"]),
});

const BlockAggregationSchema = z.object({
  blockedProfileId: z.string().uuid(),
});

export async function followProfile(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error("Cannot follow yourself");
  const db = createServiceClient();

  const { error } = await db.from("follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function unfollowProfile(followerId: string, followingId: string) {
  const db = createServiceClient();
  const { error } = await db
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function addAgendaSource(userId: string, agendaId: string, input: AgendaSourceInput) {
  const db = createServiceClient();
  const parsed = AgendaSourceSchema.parse(input);

  await assertAgendaOwner(userId, agendaId);

  const { data, error } = await db
    .from("agenda_sources")
    .insert({
      agenda_id: agendaId,
      source_profile_id: parsed.sourceProfileId ?? null,
      tag_slugs: parsed.tagSlugs,
      mode: parsed.mode,
      enabled: parsed.enabled,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to add agenda source");
  return mapAgendaSource(data);
}

export async function pinEvent(userId: string, input: unknown) {
  const db = createServiceClient();
  const parsed = PinEventSchema.parse(input);

  await assertAgendaOwner(userId, parsed.agendaId);

  const { data, error } = await db
    .from("agenda_event_pins")
    .upsert(
      {
        agenda_id: parsed.agendaId,
        event_id: parsed.eventId,
        pin_type: parsed.pinType,
      },
      { onConflict: "agenda_id,event_id" },
    )
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to pin event");
  return {
    id: String(data.id),
    agendaId: String(data.agenda_id),
    eventId: String(data.event_id),
    pinType: String(data.pin_type),
  };
}

export async function blockAggregation(userId: string, input: unknown) {
  const db = createServiceClient();
  const parsed = BlockAggregationSchema.parse(input);

  if (userId === parsed.blockedProfileId) throw new Error("Cannot block yourself");

  const { error } = await db.from("author_aggregation_blocks").insert({
    author_id: userId,
    blocked_profile_id: parsed.blockedProfileId,
  });

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listFollowers(profileId: string) {
  const db = createServiceClient();

  const { data, error } = await db
    .from("follows")
    .select("follower_id, created_at, profiles:follower_id(id, slug, display_name, avatar_url)")
    .eq("following_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const raw = row.profiles;
    const profile = (Array.isArray(raw) ? raw[0] : raw) as {
      id: string;
      slug: string;
      display_name: string;
      avatar_url: string | null;
    } | null;

    return {
      followerId: String(row.follower_id),
      followedAt: String(row.created_at),
      profile: profile
        ? {
            id: profile.id,
            slug: profile.slug,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
          }
        : null,
    };
  });
}

async function assertAgendaOwner(userId: string, agendaId: string) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("agendas")
    .select("owner_id")
    .eq("id", agendaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.owner_id !== userId) throw new Error("Forbidden");
}

function mapAgendaSource(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    agendaId: String(row.agenda_id),
    sourceProfileId: row.source_profile_id ? String(row.source_profile_id) : null,
    tagSlugs: (row.tag_slugs as string[]) ?? [],
    mode: String(row.mode),
    enabled: Boolean(row.enabled),
  };
}
