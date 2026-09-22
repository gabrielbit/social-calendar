-- Asistente de agenda. Nadie queda habilitado: la fila se inserta a mano.
--
-- insert into public.agent_entitlements (user_id, enabled, enabled_at)
-- values ('UUID', true, now())
-- on conflict (user_id) do update set enabled = true, enabled_at = now();

create table if not exists public.agent_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  enabled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_preferences
  add column if not exists agent_provider text not null default 'openai';

alter table public.user_preferences
  drop constraint if exists user_preferences_agent_provider_check;

alter table public.user_preferences
  add constraint user_preferences_agent_provider_check
  check (agent_provider in ('openai', 'anthropic', 'deepseek'));

create table if not exists public.agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_threads_user_idx
  on public.agent_threads (user_id, updated_at desc);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  image_urls text[] not null default '{}',
  draft jsonb,
  created_occurrence_id uuid references public.event_occurrences(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists agent_messages_thread_idx
  on public.agent_messages (thread_id, created_at);

alter table public.agent_entitlements enable row level security;
alter table public.agent_threads enable row level security;
alter table public.agent_messages enable row level security;

create policy agent_entitlements_select_own on public.agent_entitlements
  for select to authenticated
  using (auth.uid() = user_id);

create policy agent_threads_select_own on public.agent_threads
  for select to authenticated
  using (auth.uid() = user_id);

create policy agent_messages_select_own on public.agent_messages
  for select to authenticated
  using (auth.uid() = user_id);

-- Los default privileges dan escritura a authenticated. El flag y los hilos
-- solo los escribe la API con service role.
revoke all on table public.agent_entitlements from anon, authenticated;
grant select on table public.agent_entitlements to authenticated;
grant all on table public.agent_entitlements to service_role;

revoke all on table public.agent_threads from anon, authenticated;
grant select on table public.agent_threads to authenticated;
grant all on table public.agent_threads to service_role;

revoke all on table public.agent_messages from anon, authenticated;
grant select on table public.agent_messages to authenticated;
grant all on table public.agent_messages to service_role;
