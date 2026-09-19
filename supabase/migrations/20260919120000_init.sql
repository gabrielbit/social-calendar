-- Agenda Comunidad initial schema
-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "postgis";
-- pgvector for phase 3; enable early so migrations are stable
create extension if not exists "vector";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

-- Enums
do $$ begin
  create type profile_type as enum ('person','band','collective','producer','venue','organization');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_visibility as enum ('private','shared','public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type editorial_status as enum ('draft','published','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type birthday_visibility as enum ('hidden','followers','public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rsvp_status as enum ('going','not_going');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum ('no_aplica','pendiente','comprada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_type as enum ('url','whatsapp','email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type location_mode as enum ('physical','online','hybrid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type outbox_status as enum ('pending','processing','done','failed');
exception when duplicate_object then null; end $$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  profile_type profile_type not null default 'person',
  bio text,
  avatar_url text,
  cover_url text,
  public_location text,
  links jsonb not null default '[]'::jsonb,
  default_event_visibility event_visibility not null default 'shared',
  birthday_month smallint check (birthday_month between 1 and 12),
  birthday_day smallint check (birthday_day between 1 and 31),
  birthday_year smallint check (birthday_year between 1900 and 2100),
  birthday_visibility birthday_visibility not null default 'followers',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists profiles_slug_idx on public.profiles (slug) where deleted_at is null;

-- Keep birth year inaccessible via public views; column stays on table for owner only.

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  home_zone text,
  home_lat double precision,
  home_lng double precision,
  search_radius_km numeric(5,2) default 5,
  preferred_tags text[] not null default '{}',
  notify_email boolean not null default true,
  notify_push boolean not null default false,
  notify_birthdays boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  zone text,
  country text default 'AR',
  location geography(point, 4326),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists venues_location_idx on public.venues using gist (location);

create table if not exists public.agendas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create unique index if not exists agendas_one_primary_per_owner
  on public.agendas (owner_id) where is_primary;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  aliases text[] not null default '{}'
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  agenda_id uuid not null references public.agendas(id) on delete cascade,
  slug text not null,
  title text not null,
  description_html text,
  visibility event_visibility not null default 'shared',
  editorial_status editorial_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  rrule text,
  location_mode location_mode not null default 'physical',
  venue_id uuid references public.venues(id) on delete set null,
  online_url text,
  site_url text,
  tickets_url text,
  is_free boolean not null default false,
  price_label text,
  ticket_deadline_at timestamptz,
  contact_type contact_type,
  contact_value text,
  capacity integer,
  language text not null default 'es',
  age_restriction text,
  accessibility_notes text,
  cover_image_url text,
  gallery_urls text[] not null default '{}',
  linked_birthday boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (agenda_id, slug),
  check (ends_at >= starts_at)
);

create index if not exists events_author_idx on public.events (author_id) where deleted_at is null;
create index if not exists events_visibility_idx on public.events (visibility, editorial_status) where deleted_at is null;

create table if not exists public.event_tags (
  event_id uuid not null references public.events(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (event_id, tag_id)
);

create table if not exists public.event_occurrences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  is_exception boolean not null default false,
  cancelled boolean not null default false,
  original_starts_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, starts_at)
);

create index if not exists event_occurrences_range_idx
  on public.event_occurrences (starts_at, ends_at)
  where cancelled = false;

create table if not exists public.agenda_sources (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null references public.agendas(id) on delete cascade,
  source_profile_id uuid references public.profiles(id) on delete cascade,
  tag_slugs text[] not null default '{}',
  mode text not null default 'all_public' check (mode in ('all_public','tags_intersection')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.agenda_event_pins (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null references public.agendas(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  pin_type text not null check (pin_type in ('include','exclude')),
  created_at timestamptz not null default now(),
  unique (agenda_id, event_id)
);

create table if not exists public.author_aggregation_blocks (
  author_id uuid not null references public.profiles(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (author_id, blocked_profile_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.event_occurrences(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status rsvp_status not null,
  profile_visible boolean not null default true,
  ticket_status ticket_status not null default 'no_aplica',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (occurrence_id, user_id)
);

create index if not exists event_rsvps_user_idx on public.event_rsvps (user_id, status);

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'google',
  encrypted_tokens text not null,
  external_calendar_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.external_event_syncs (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references public.event_rsvps(id) on delete cascade,
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  external_event_id text,
  last_synced_version text,
  last_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rsvp_id, connection_id)
);

create table if not exists public.outbox_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status outbox_status not null default 'pending',
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outbox_jobs_pending_idx
  on public.outbox_jobs (run_after)
  where status = 'pending';

create table if not exists public.activity_events (
  id bigserial primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_subject_idx
  on public.activity_events (subject_type, subject_id, created_at desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null check (subject_type in ('event','profile','occurrence')),
  subject_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  moderator_id uuid references public.profiles(id) on delete set null,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, action, window_start)
);

-- Helper: effective visibility for an event for a viewer
create or replace function private.can_view_event(p_event public.events, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_event.deleted_at is not null then false
    when p_event.editorial_status = 'draft' then viewer = p_event.author_id
    when p_event.visibility = 'private' then viewer = p_event.author_id
    when p_event.visibility in ('shared','public') then true
    else false
  end;
$$;

revoke all on function private.can_view_event(public.events, uuid) from public;
grant execute on function private.can_view_event(public.events, uuid) to authenticated, anon, service_role;

-- Composed agenda occurrences (own + sources + pins - excludes - blocks)
create or replace function public.agenda_occurrences(
  p_agenda_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_viewer uuid default auth.uid()
)
returns table (
  occurrence_id uuid,
  event_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean,
  timezone text,
  title text,
  cover_image_url text,
  visibility event_visibility,
  original_promoter_id uuid,
  original_promoter_slug text,
  original_promoter_name text,
  host_agenda_id uuid,
  inclusion_reason text
)
language sql
stable
security invoker
set search_path = public
as $$
  with agenda as (
    select * from agendas where id = p_agenda_id
  ),
  own_events as (
    select e.*, 'own'::text as reason
    from events e
    join agenda a on a.id = e.agenda_id
    where e.deleted_at is null
      and private.can_view_event(e, p_viewer)
  ),
  sourced as (
    select e.*, 'source'::text as reason
    from agenda_sources s
    join agenda a on a.id = s.agenda_id
    join events e on e.author_id = s.source_profile_id
    where s.enabled
      and e.deleted_at is null
      and e.visibility = 'public'
      and e.editorial_status = 'published'
      and e.linked_birthday = false
      and not exists (
        select 1 from author_aggregation_blocks b
        where b.author_id = e.author_id and b.blocked_profile_id = a.owner_id
      )
      and (
        s.mode = 'all_public'
        or (
          s.mode = 'tags_intersection'
          and exists (
            select 1
            from event_tags et
            join tags t on t.id = et.tag_id
            where et.event_id = e.id
              and t.slug = any (s.tag_slugs)
          )
        )
      )
  ),
  pinned as (
    select e.*, 'pin'::text as reason
    from agenda_event_pins p
    join events e on e.id = p.event_id
    where p.agenda_id = p_agenda_id
      and p.pin_type = 'include'
      and e.deleted_at is null
      and e.visibility = 'public'
      and e.editorial_status = 'published'
  ),
  excluded as (
    select event_id from agenda_event_pins
    where agenda_id = p_agenda_id and pin_type = 'exclude'
  ),
  combined as (
    select * from own_events
    union all
    select * from sourced
    union all
    select * from pinned
  ),
  dedup as (
    select distinct on (c.id)
      c.*
    from combined c
    where c.id not in (select event_id from excluded)
    order by c.id,
      case c.reason when 'own' then 0 when 'pin' then 1 else 2 end
  )
  select
    o.id as occurrence_id,
    d.id as event_id,
    o.starts_at,
    o.ends_at,
    o.all_day,
    o.timezone,
    d.title,
    d.cover_image_url,
    d.visibility,
    d.author_id as original_promoter_id,
    pr.slug as original_promoter_slug,
    pr.display_name as original_promoter_name,
    p_agenda_id as host_agenda_id,
    d.reason as inclusion_reason
  from dedup d
  join event_occurrences o on o.event_id = d.id
  join profiles pr on pr.id = d.author_id
  where o.cancelled = false
    and o.starts_at < p_to
    and o.ends_at > p_from
  order by o.starts_at;
$$;

-- Birthday dates visible to followers (no year)
create or replace function public.network_birthdays(p_viewer uuid default auth.uid())
returns table (
  profile_id uuid,
  slug text,
  display_name text,
  birthday_month smallint,
  birthday_day smallint,
  next_date date
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.slug,
    p.display_name,
    p.birthday_month,
    p.birthday_day,
    make_date(
      case
        when make_date(extract(year from now())::int, p.birthday_month,
          least(p.birthday_day, extract(day from (date_trunc('month', make_date(extract(year from now())::int, p.birthday_month, 1)) + interval '1 month - 1 day'))::int)
        ) < current_date
        then extract(year from now())::int + 1
        else extract(year from now())::int
      end,
      p.birthday_month,
      case
        when p.birthday_month = 2 and p.birthday_day = 29
          and not ((extract(year from now())::int % 4 = 0 and extract(year from now())::int % 100 <> 0) or extract(year from now())::int % 400 = 0)
        then 28
        else p.birthday_day
      end
    ) as next_date
  from profiles p
  join follows f on f.following_id = p.id and f.follower_id = p_viewer
  where p.deleted_at is null
    and p.birthday_month is not null
    and p.birthday_day is not null
    and p.birthday_visibility in ('followers','public');
$$;

-- Public profile view without birthday_year
create or replace view public.profiles_public
with (security_invoker = true)
as
select
  id, slug, display_name, profile_type, bio, avatar_url, cover_url,
  public_location, links, default_event_visibility,
  case when birthday_visibility = 'public' then birthday_month else null end as birthday_month,
  case when birthday_visibility = 'public' then birthday_day else null end as birthday_day,
  birthday_visibility,
  created_at
from profiles
where deleted_at is null;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.venues enable row level security;
alter table public.agendas enable row level security;
alter table public.tags enable row level security;
alter table public.events enable row level security;
alter table public.event_tags enable row level security;
alter table public.event_occurrences enable row level security;
alter table public.agenda_sources enable row level security;
alter table public.agenda_event_pins enable row level security;
alter table public.author_aggregation_blocks enable row level security;
alter table public.follows enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.external_event_syncs enable row level security;
alter table public.outbox_jobs enable row level security;
alter table public.activity_events enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.rate_limits enable row level security;

-- Profiles policies
create policy profiles_select_public on public.profiles
  for select using (deleted_at is null);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

-- Hide birthday_year from anon/authenticated (owner reads via service API)
revoke select on public.profiles from anon, authenticated;
grant select (
  id, slug, display_name, profile_type, bio, avatar_url, cover_url,
  public_location, links, default_event_visibility,
  birthday_month, birthday_day, birthday_visibility,
  onboarding_completed_at, created_at, updated_at, deleted_at
) on public.profiles to anon, authenticated;
grant select on public.profiles to service_role;
grant insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- Preferences: owner only
create policy prefs_owner on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Agendas
create policy agendas_select on public.agendas for select using (true);
create policy agendas_write_own on public.agendas
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Tags readable by all, writable by authenticated
create policy tags_select on public.tags for select using (true);
create policy tags_insert on public.tags for insert to authenticated with check (true);

-- Events
create policy events_select on public.events
  for select using (
    deleted_at is null and (
      author_id = auth.uid()
      or (editorial_status = 'published' and visibility in ('shared','public'))
    )
  );

create policy events_write_own on public.events
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy event_tags_select on public.event_tags for select using (true);
create policy event_tags_write on public.event_tags
  for all using (
    exists (select 1 from events e where e.id = event_id and e.author_id = auth.uid())
  ) with check (
    exists (select 1 from events e where e.id = event_id and e.author_id = auth.uid())
  );

create policy occurrences_select on public.event_occurrences
  for select using (
    exists (
      select 1 from events e
      where e.id = event_id and (
        e.author_id = auth.uid()
        or (e.editorial_status = 'published' and e.visibility in ('shared','public') and e.deleted_at is null)
      )
    )
  );

create policy occurrences_write on public.event_occurrences
  for all using (
    exists (select 1 from events e where e.id = event_id and e.author_id = auth.uid())
  ) with check (
    exists (select 1 from events e where e.id = event_id and e.author_id = auth.uid())
  );

create policy venues_select on public.venues for select using (true);
create policy venues_insert on public.venues for insert to authenticated with check (auth.uid() = created_by);

create policy sources_owner on public.agenda_sources
  for all using (
    exists (select 1 from agendas a where a.id = agenda_id and a.owner_id = auth.uid())
  ) with check (
    exists (select 1 from agendas a where a.id = agenda_id and a.owner_id = auth.uid())
  );

create policy sources_select on public.agenda_sources for select using (true);

create policy pins_owner on public.agenda_event_pins
  for all using (
    exists (select 1 from agendas a where a.id = agenda_id and a.owner_id = auth.uid())
  ) with check (
    exists (select 1 from agendas a where a.id = agenda_id and a.owner_id = auth.uid())
  );

create policy pins_select on public.agenda_event_pins for select using (true);

create policy blocks_owner on public.author_aggregation_blocks
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy blocks_select_related on public.author_aggregation_blocks
  for select using (auth.uid() = author_id or auth.uid() = blocked_profile_id);

create policy follows_select on public.follows for select using (true);
create policy follows_write on public.follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create policy rsvps_select on public.event_rsvps
  for select using (
    user_id = auth.uid()
    or (status = 'going' and profile_visible = true)
  );

create policy rsvps_write on public.event_rsvps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy calendar_conn_owner on public.calendar_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy external_sync_owner on public.external_event_syncs
  for all using (
    exists (
      select 1 from event_rsvps r where r.id = rsvp_id and r.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from event_rsvps r where r.id = rsvp_id and r.user_id = auth.uid()
    )
  );

-- Outbox: service role only (no policies for anon/auth)
create policy outbox_service on public.outbox_jobs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy activity_insert on public.activity_events
  for insert to authenticated, anon with check (true);

create policy activity_select_own on public.activity_events
  for select using (actor_id = auth.uid() or auth.role() = 'service_role');

create policy reports_insert on public.reports
  for insert to authenticated with check (auth.uid() = reporter_id);

create policy reports_select_own on public.reports
  for select using (auth.uid() = reporter_id or auth.role() = 'service_role');

create policy moderation_service on public.moderation_actions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy rate_limits_owner on public.rate_limits
  for all using (auth.uid() = user_id or auth.role() = 'service_role')
  with check (auth.uid() = user_id or auth.role() = 'service_role');

-- Storage bucket policies documented in config; create bucket via dashboard/API:
-- media: public read, authenticated write to folder {user_id}/*

-- Trigger: create profile scaffolding is done in API onboarding (explicit).

-- Seed common tags
insert into public.tags (slug, name, aliases) values
  ('yoga', 'Yoga', array['yoga']),
  ('pilates', 'Pilates', array['pilates']),
  ('fiesta', 'Fiesta', array['party','boliche']),
  ('bailar', 'Bailar', array['baile','dance']),
  ('musica', 'Música', array['music','concierto']),
  ('teatro', 'Teatro', array['obra']),
  ('charla', 'Charla', array['talk','conferencia']),
  ('taller', 'Taller', array['workshop']),
  ('milonga', 'Milonga', array['tango']),
  ('arte', 'Arte', array['expo','exhibicion'])
on conflict (slug) do nothing;
