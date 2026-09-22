import { z } from "zod";

export const ProfileTypeSchema = z.enum([
  "person",
  "band",
  "collective",
  "producer",
  "venue",
  "organization",
]);
export type ProfileType = z.infer<typeof ProfileTypeSchema>;

export const EventVisibilitySchema = z.enum(["private", "shared", "public"]);
export type EventVisibility = z.infer<typeof EventVisibilitySchema>;

export const EditorialStatusSchema = z.enum(["draft", "published", "cancelled"]);
export type EditorialStatus = z.infer<typeof EditorialStatusSchema>;

export const BirthdayVisibilitySchema = z.enum(["hidden", "followers", "public"]);
export type BirthdayVisibility = z.infer<typeof BirthdayVisibilitySchema>;

export const RsvpStatusSchema = z.enum(["going", "not_going"]);
export type RsvpStatus = z.infer<typeof RsvpStatusSchema>;

export const TicketStatusSchema = z.enum(["no_aplica", "pendiente", "comprada"]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const ContactTypeSchema = z.enum(["url", "whatsapp", "email"]);
export type ContactType = z.infer<typeof ContactTypeSchema>;

export const LocationModeSchema = z.enum(["physical", "online", "hybrid"]);
export type LocationMode = z.infer<typeof LocationModeSchema>;

export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

export const SlugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido");

export const ContactSchema = z.object({
  type: ContactTypeSchema,
  value: z.string().min(1).max(500),
  label: z.string().max(80).optional(),
});

export const CreateProfileSchema = z.object({
  displayName: z.string().min(1).max(120),
  slug: SlugSchema,
  profileType: ProfileTypeSchema.default("person"),
  bio: z.string().max(2000).optional(),
  defaultEventVisibility: EventVisibilitySchema.default("shared"),
  birthdayMonth: z.number().int().min(1).max(12).optional(),
  birthdayDay: z.number().int().min(1).max(31).optional(),
  birthdayYear: z.number().int().min(1900).max(2100).optional(),
  birthdayVisibility: BirthdayVisibilitySchema.default("followers"),
  instagramHandle: z.string().max(80).nullable().optional(),
  whatsappPhone: z.string().max(32).nullable().optional(),
  contactEmail: z.string().max(200).nullable().optional(),
  allowContact: z.boolean().optional(),
});
export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  slug: SlugSchema.optional(),
  descriptionHtml: z.string().max(50_000).optional(),
  visibility: EventVisibilitySchema.optional(),
  editorialStatus: EditorialStatusSchema.default("published"),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  allDay: z.boolean().default(false),
  timezone: z.string().default(DEFAULT_TIMEZONE),
  rrule: z.string().max(500).nullable().optional(),
  locationMode: LocationModeSchema.default("physical"),
  venueId: z.string().uuid().nullable().optional(),
  locationLabel: z.string().max(300).nullable().optional(),
  onlineUrl: z.string().url().nullable().optional(),
  siteUrl: z.string().url().nullable().optional(),
  ticketsUrl: z.string().url().nullable().optional(),
  isFree: z.boolean().default(false),
  priceLabel: z.string().max(120).nullable().optional(),
  ticketDeadlineAt: z.string().datetime({ offset: true }).nullable().optional(),
  contact: ContactSchema.nullable().optional(),
  allowContact: z.boolean().optional(),
  contactInstagram: z.string().max(80).nullable().optional(),
  contactWhatsapp: z.string().max(32).nullable().optional(),
  contactEmail: z.string().max(200).nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  language: z.string().max(16).default("es"),
  ageRestriction: z.string().max(80).nullable().optional(),
  accessibilityNotes: z.string().max(1000).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  galleryUrls: z.array(z.string().url()).max(12).default([]),
  tagSlugs: z.array(SlugSchema).max(20).default([]),
  linkedBirthday: z.boolean().default(false),
});
export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const SearchQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  tags: z.array(SlugSchema).default([]),
  zone: z.string().max(120).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().positive().max(100).optional(),
  q: z.string().max(200).optional(),
  profileType: ProfileTypeSchema.optional(),
  mode: z.enum(["feed", "carousel", "sections"]).default("feed"),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const RsvpInputSchema = z.object({
  occurrenceId: z.string().uuid(),
  status: RsvpStatusSchema,
  profileVisible: z.boolean().default(true),
  ticketStatus: TicketStatusSchema.default("no_aplica"),
});
export type RsvpInput = z.infer<typeof RsvpInputSchema>;

export const AgentProviderSchema = z.enum(["openai", "anthropic", "deepseek"]);
export type AgentProvider = z.infer<typeof AgentProviderSchema>;

export const AgentEventDraftSchema = z.object({
  title: z.string().min(1).max(200),
  descriptionHtml: z.string().max(50_000).nullish(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  allDay: z.boolean().default(false),
  timezone: z.string().default(DEFAULT_TIMEZONE),
  locationMode: LocationModeSchema.default("physical"),
  locationLabel: z.string().max(300).nullish(),
  onlineUrl: z.string().url().nullish(),
  siteUrl: z.string().url().nullish(),
  ticketsUrl: z.string().url().nullish(),
  isFree: z.boolean().default(false),
  priceLabel: z.string().max(120).nullish(),
  coverImageUrl: z.string().url().nullish(),
  galleryUrls: z.array(z.string().url()).max(12).default([]),
  tagSlugs: z.array(SlugSchema).max(20).default([]),
});
export type AgentEventDraft = z.infer<typeof AgentEventDraftSchema>;

export const AgendaSourceSchema = z.object({
  sourceProfileId: z.string().uuid().optional(),
  tagSlugs: z.array(SlugSchema).default([]),
  mode: z.enum(["all_public", "tags_intersection"]).default("all_public"),
  enabled: z.boolean().default(true),
});
export type AgendaSourceInput = z.infer<typeof AgendaSourceSchema>;
