-- Las tablas de 20260919120000_init.sql quedaron con RLS pero sin privilegios de tabla
-- para los roles de la Data API, así que toda escritura fallaba con "permission denied".
-- RLS sigue siendo el control de filas; estos grants solo habilitan el acceso base.

grant usage on schema public to anon, authenticated, service_role;

-- agenda_occurrences corre como el invocador y llama a private.can_view_event. La migración
-- inicial dio execute sobre la función pero no usage sobre el esquema, así que las agendas
-- públicas fallaban con "permission denied for schema private". El esquema no está expuesto
-- vía PostgREST y estos roles solo tienen execute sobre esa función.
grant usage on schema private to anon, authenticated;

do $$
declare
  obj regclass;
begin
  for obj in
    select c.oid::regclass
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'v')
      and c.relowner = current_user::regrole
  loop
    execute format('grant select on %s to anon', obj);
    execute format('grant select, insert, update, delete on %s to authenticated', obj);
    execute format('grant all on %s to service_role', obj);
  end loop;
end $$;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Reponer la restricción por columna: birthday_year nunca se expone vía Data API.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, slug, display_name, profile_type, bio, avatar_url, cover_url,
  public_location, links, default_event_visibility,
  birthday_month, birthday_day, birthday_visibility,
  onboarding_completed_at, created_at, updated_at, deleted_at
) on public.profiles to anon, authenticated;

-- Que las próximas tablas del esquema hereden lo mismo.
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
