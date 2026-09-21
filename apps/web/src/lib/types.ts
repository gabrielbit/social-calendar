import type { ProfileType, LocationMode, EventVisibility } from "@agenda/domain";

export type ProfilePublic = {
  id: string;
  slug: string;
  display_name: string;
  profile_type: ProfileType;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  public_location: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_visibility: string;
  instagram_handle: string | null;
  whatsapp_phone: string | null;
  contact_email: string | null;
  allow_contact: boolean;
  created_at: string;
};

export type Tag = {
  id: string;
  slug: string;
  name: string;
};

export type AgendaOccurrence = {
  occurrence_id: string;
  event_id: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
  title: string;
  cover_image_url: string | null;
  visibility: EventVisibility;
  original_promoter_id: string;
  original_promoter_slug: string;
  original_promoter_name: string;
  host_agenda_id: string;
  inclusion_reason: string;
};

export type EventDetail = {
  id: string;
  slug: string;
  title: string;
  description_html: string | null;
  visibility: EventVisibility;
  editorial_status: string;
  location_mode: LocationMode;
  online_url: string | null;
  site_url: string | null;
  tickets_url: string | null;
  is_free: boolean;
  price_label: string | null;
  cover_image_url: string | null;
  author_id: string;
  timezone: string;
  allow_contact: boolean;
  contact_instagram: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  contact_type: string | null;
  contact_value: string | null;
  author?: {
    slug: string;
    display_name: string;
    avatar_url: string | null;
  };
  venue?: {
    name: string;
    address: string | null;
    zone: string | null;
    city: string | null;
  } | null;
  tags?: Tag[];
};

export type OccurrenceDetail = {
  id: string;
  event_id: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
  cancelled: boolean;
  event: EventDetail;
};

export type NetworkBirthday = {
  profile_id: string;
  slug: string;
  display_name: string;
  birthday_month: number;
  birthday_day: number;
  next_date: string;
};

export type ExploreResult = {
  occurrence_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
  cover_image_url: string | null;
  author_slug: string;
  author_name: string;
  zone: string | null;
  tag_slugs: string[];
};

export type HomeCalendarEvent = ExploreResult & {
  venue_name: string | null;
  place: string | null;
  price_label: string | null;
  is_free: boolean;
  site_url: string | null;
  going: boolean;
};

export type HomePersonalEvent = {
  occurrence_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
};

export type HomeCalendarData = {
  events: HomeCalendarEvent[];
  personal: HomePersonalEvent[];
  birthdays: NetworkBirthday[];
  googleConnected: boolean;
};
