type ProfileRow = {
  id: string;
  slug: string;
  display_name: string;
  profile_type: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  public_location: string | null;
  links: unknown;
  default_event_visibility: string;
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_year?: number | null;
  birthday_visibility: string;
  onboarding_completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PublicProfileDto = {
  id: string;
  slug: string;
  displayName: string;
  profileType: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  publicLocation: string | null;
  links: unknown;
  defaultEventVisibility: string;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayVisibility: string;
  createdAt?: string;
};

export type OwnerProfileDto = PublicProfileDto & {
  birthdayYear: number | null;
  onboardingCompletedAt: string | null;
};

export function toPublicProfile(row: ProfileRow, opts?: { includeBirthday?: boolean }): PublicProfileDto {
  const includeBirthday = opts?.includeBirthday ?? false;
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    profileType: row.profile_type,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    publicLocation: row.public_location,
    links: row.links,
    defaultEventVisibility: row.default_event_visibility,
    birthdayMonth: includeBirthday ? row.birthday_month : null,
    birthdayDay: includeBirthday ? row.birthday_day : null,
    birthdayVisibility: row.birthday_visibility,
    ...(row.created_at ? { createdAt: row.created_at } : {}),
  };
}

export function toOwnerProfile(row: ProfileRow): OwnerProfileDto {
  return {
    ...toPublicProfile(row, { includeBirthday: true }),
    birthdayYear: row.birthday_year ?? null,
    onboardingCompletedAt: row.onboarding_completed_at ?? null,
  };
}

export type OccurrenceDto = {
  occurrenceId: string;
  eventId: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  timezone: string;
  title: string;
  coverImageUrl: string | null;
  visibility: string;
  originalPromoterId: string;
  originalPromoterSlug: string;
  originalPromoterName: string;
  hostAgendaId: string;
  inclusionReason: string;
};

export function toOccurrenceDto(row: Record<string, unknown>): OccurrenceDto {
  return {
    occurrenceId: String(row.occurrence_id),
    eventId: String(row.event_id),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    allDay: Boolean(row.all_day),
    timezone: String(row.timezone),
    title: String(row.title),
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : null,
    visibility: String(row.visibility),
    originalPromoterId: String(row.original_promoter_id),
    originalPromoterSlug: String(row.original_promoter_slug),
    originalPromoterName: String(row.original_promoter_name),
    hostAgendaId: String(row.host_agenda_id),
    inclusionReason: String(row.inclusion_reason),
  };
}
