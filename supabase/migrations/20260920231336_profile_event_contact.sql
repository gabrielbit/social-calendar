-- Contacto público: IG, WhatsApp y email en perfil (defaults) y por evento (override).

alter table public.profiles
  add column if not exists instagram_handle text,
  add column if not exists whatsapp_phone text,
  add column if not exists contact_email text,
  add column if not exists allow_contact boolean not null default true;

alter table public.events
  add column if not exists allow_contact boolean not null default true,
  add column if not exists contact_instagram text,
  add column if not exists contact_whatsapp text,
  add column if not exists contact_email text;

alter table public.profiles
  drop constraint if exists profiles_instagram_handle_check,
  drop constraint if exists profiles_whatsapp_phone_check,
  drop constraint if exists profiles_contact_email_check;

alter table public.profiles
  add constraint profiles_instagram_handle_check
    check (instagram_handle is null or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  add constraint profiles_whatsapp_phone_check
    check (whatsapp_phone is null or whatsapp_phone ~ '^[0-9]{8,15}$'),
  add constraint profiles_contact_email_check
    check (contact_email is null or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

alter table public.events
  drop constraint if exists events_contact_instagram_check,
  drop constraint if exists events_contact_whatsapp_check,
  drop constraint if exists events_contact_email_check;

alter table public.events
  add constraint events_contact_instagram_check
    check (contact_instagram is null or contact_instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  add constraint events_contact_whatsapp_check
    check (contact_whatsapp is null or contact_whatsapp ~ '^[0-9]{8,15}$'),
  add constraint events_contact_email_check
    check (contact_email is null or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

drop view if exists public.profiles_public;

create view public.profiles_public
with (security_invoker = true)
as
select
  id, slug, display_name, profile_type, bio, avatar_url, cover_url,
  public_location, links, default_event_visibility,
  case when birthday_visibility = 'public' then birthday_month else null end as birthday_month,
  case when birthday_visibility = 'public' then birthday_day else null end as birthday_day,
  birthday_visibility,
  instagram_handle,
  whatsapp_phone,
  contact_email,
  allow_contact,
  created_at
from profiles
where deleted_at is null;

revoke select on public.profiles from anon, authenticated;
grant select (
  id, slug, display_name, profile_type, bio, avatar_url, cover_url,
  public_location, links, default_event_visibility,
  birthday_month, birthday_day, birthday_visibility,
  instagram_handle, whatsapp_phone, contact_email, allow_contact,
  onboarding_completed_at, created_at, updated_at, deleted_at
) on public.profiles to anon, authenticated;

grant select on public.profiles_public to anon, authenticated, service_role;
