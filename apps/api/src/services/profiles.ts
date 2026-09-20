import {
  CreateProfileSchema,
  type CreateProfileInput,
  SlugSchema,
} from "@agenda/domain";
import { z } from "zod";
import { createServiceClient } from "../lib/supabase.js";
import { toOwnerProfile, toPublicProfile, type OwnerProfileDto, type PublicProfileDto } from "../lib/mappers.js";

const UpdateProfileSchema = CreateProfileSchema.partial().extend({
  avatarUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  publicLocation: z.string().max(120).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

const UpdatePreferencesSchema = z.object({
  homeZone: z.string().max(120).nullable().optional(),
  homeLat: z.number().min(-90).max(90).nullable().optional(),
  homeLng: z.number().min(-180).max(180).nullable().optional(),
  searchRadiusKm: z.number().positive().max(500).optional(),
  preferredTags: z.array(SlugSchema).optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  notifyBirthdays: z.boolean().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

export type PreferencesDto = {
  homeZone: string | null;
  homeLat: number | null;
  homeLng: number | null;
  searchRadiusKm: number | null;
  preferredTags: string[];
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyBirthdays: boolean;
};

export async function ensureOnboarding(userId: string, input: CreateProfileInput): Promise<OwnerProfileDto> {
  const db = createServiceClient();
  const parsed = CreateProfileSchema.parse(input);

  const now = new Date().toISOString();
  const { data: existing } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();

  let profile = existing;
  if (!profile) {
    const { data: created, error: profileError } = await db
      .from("profiles")
      .insert({
        id: userId,
        slug: parsed.slug,
        display_name: parsed.displayName,
        profile_type: parsed.profileType,
        bio: parsed.bio ?? null,
        default_event_visibility: parsed.defaultEventVisibility,
        birthday_month: parsed.birthdayMonth ?? null,
        birthday_day: parsed.birthdayDay ?? null,
        birthday_year: parsed.birthdayYear ?? null,
        birthday_visibility: parsed.birthdayVisibility,
        onboarding_completed_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (profileError || !created) {
      throw new Error(profileError?.message ?? "Failed to create profile");
    }
    profile = created;
  }

  // Los pasos siguientes son idempotentes: si un onboarding anterior quedó a mitad
  // de camino, la cuenta no puede quedarse sin agenda ni preferencias.
  const { error: agendaError } = await db.from("agendas").upsert(
    {
      owner_id: userId,
      slug: "principal",
      title: "Agenda principal",
      is_primary: true,
    },
    { onConflict: "owner_id,slug" },
  );
  if (agendaError) throw new Error(agendaError.message);

  const { error: prefsError } = await db
    .from("user_preferences")
    .upsert({ user_id: userId }, { onConflict: "user_id" });
  if (prefsError) throw new Error(prefsError.message);

  return toOwnerProfile(profile);
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<OwnerProfileDto> {
  const db = createServiceClient();
  const parsed = UpdateProfileSchema.parse(input);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.displayName !== undefined) patch.display_name = parsed.displayName;
  if (parsed.slug !== undefined) patch.slug = parsed.slug;
  if (parsed.profileType !== undefined) patch.profile_type = parsed.profileType;
  if (parsed.bio !== undefined) patch.bio = parsed.bio;
  if (parsed.defaultEventVisibility !== undefined) patch.default_event_visibility = parsed.defaultEventVisibility;
  if (parsed.birthdayMonth !== undefined) patch.birthday_month = parsed.birthdayMonth;
  if (parsed.birthdayDay !== undefined) patch.birthday_day = parsed.birthdayDay;
  if (parsed.birthdayYear !== undefined) patch.birthday_year = parsed.birthdayYear;
  if (parsed.birthdayVisibility !== undefined) patch.birthday_visibility = parsed.birthdayVisibility;
  if (parsed.avatarUrl !== undefined) patch.avatar_url = parsed.avatarUrl;
  if (parsed.coverUrl !== undefined) patch.cover_url = parsed.coverUrl;
  if (parsed.publicLocation !== undefined) patch.public_location = parsed.publicLocation;

  const { data, error } = await db.from("profiles").update(patch).eq("id", userId).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update profile");

  return toOwnerProfile(data);
}

export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput,
): Promise<PreferencesDto> {
  const db = createServiceClient();
  const parsed = UpdatePreferencesSchema.parse(input);

  const patch: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (parsed.homeZone !== undefined) patch.home_zone = parsed.homeZone;
  if (parsed.homeLat !== undefined) patch.home_lat = parsed.homeLat;
  if (parsed.homeLng !== undefined) patch.home_lng = parsed.homeLng;
  if (parsed.searchRadiusKm !== undefined) patch.search_radius_km = parsed.searchRadiusKm;
  if (parsed.preferredTags !== undefined) patch.preferred_tags = parsed.preferredTags;
  if (parsed.notifyEmail !== undefined) patch.notify_email = parsed.notifyEmail;
  if (parsed.notifyPush !== undefined) patch.notify_push = parsed.notifyPush;
  if (parsed.notifyBirthdays !== undefined) patch.notify_birthdays = parsed.notifyBirthdays;

  const { data, error } = await db
    .from("user_preferences")
    .upsert(patch, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update preferences");

  return {
    homeZone: data.home_zone ?? null,
    homeLat: data.home_lat ?? null,
    homeLng: data.home_lng ?? null,
    searchRadiusKm: data.search_radius_km === null ? null : Number(data.search_radius_km),
    preferredTags: data.preferred_tags ?? [],
    notifyEmail: data.notify_email,
    notifyPush: data.notify_push,
    notifyBirthdays: data.notify_birthdays,
  };
}

export async function getOwnerProfile(userId: string): Promise<OwnerProfileDto | null> {
  const db = createServiceClient();
  const { data, error } = await db.from("profiles").select("*").eq("id", userId).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return toOwnerProfile(data);
}

export async function getPublicProfile(
  slugInput: string,
  viewerId?: string,
): Promise<PublicProfileDto | null> {
  const slug = SlugSchema.parse(slugInput);
  const db = createServiceClient();

  const { data, error } = await db
    .from("profiles_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const isOwner = Boolean(viewerId) && viewerId === data.id;
  if (isOwner && viewerId) {
    const owner = await getOwnerProfile(viewerId);
    return owner;
  }

  let includeBirthday = data.birthday_visibility === "public";
  if (!includeBirthday && viewerId && data.birthday_visibility === "followers") {
    const { data: follow } = await db
      .from("follows")
      .select("follower_id")
      .eq("follower_id", viewerId)
      .eq("following_id", data.id)
      .maybeSingle();
    includeBirthday = Boolean(follow);
  }

  return toPublicProfile(
    {
      ...data,
      display_name: data.display_name,
      profile_type: data.profile_type,
      avatar_url: data.avatar_url,
      cover_url: data.cover_url,
      public_location: data.public_location,
      default_event_visibility: data.default_event_visibility,
      birthday_month: includeBirthday ? data.birthday_month : null,
      birthday_day: includeBirthday ? data.birthday_day : null,
      birthday_visibility: data.birthday_visibility,
    },
    { includeBirthday },
  );
}
