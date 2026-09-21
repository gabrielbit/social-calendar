-- Datos de ejemplo para desarrollo local: 7 perfiles y 20 eventos de yoga, danza y teatro.
-- Se aplica automáticamente con `supabase db reset`. Todas las fechas son relativas a now(),
-- así que el seed nunca "vence". Contraseña de todos los usuarios: dummy-pass-123
--
-- NO usar en producción.

-- ---------------------------------------------------------------------------
-- Usuarios de Auth
-- ---------------------------------------------------------------------------
-- GoTrue lee las columnas de token como texto no nulo, así que van en '' y no en NULL.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  u.email, crypt('dummy-pass-123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'ana@dummy.test'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'raiz@dummy.test'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'faro@dummy.test'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'marina@dummy.test'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'grieta@dummy.test'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'sol@dummy.test'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'bruno@dummy.test')
) as u(id, email)
on conflict (id) do nothing;

insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.email like '%@dummy.test'
on conflict (provider_id, provider) do nothing;

-- ---------------------------------------------------------------------------
-- Perfiles, agendas y preferencias
-- ---------------------------------------------------------------------------
insert into public.profiles (
  id, slug, display_name, profile_type, bio, public_location,
  default_event_visibility, birthday_month, birthday_day, birthday_visibility,
  onboarding_completed_at
)
values
  ('a0000000-0000-4000-8000-000000000001', 'ana-yoga',       'Ana Ruiz',            'person',       'Profesora de hatha y vinyasa. Clases en Palermo y al aire libre.',        'Palermo',      'public', 3,  14, 'followers', now()),
  ('a0000000-0000-4000-8000-000000000002', 'colectivo-raiz', 'Colectivo Raíz',      'collective',   'Danza contemporánea e investigación del movimiento desde 2018.',          'Villa Crespo', 'public', 8,  2,  'public',    now()),
  ('a0000000-0000-4000-8000-000000000003', 'teatro-el-faro', 'Teatro El Faro',      'venue',        'Sala independiente en San Telmo. Programación de teatro y performance.',  'San Telmo',    'public', 11, 27, 'public',    now()),
  ('a0000000-0000-4000-8000-000000000004', 'marina-danza',   'Marina Costa',        'person',       'Tango, folclore y milongas para principiantes.',                          'Almagro',      'public', 5,  9,  'followers', now()),
  ('a0000000-0000-4000-8000-000000000005', 'cia-la-grieta',  'Cía. La Grieta',      'collective',   'Teatro independiente. Obras propias y ciclos de teatro breve.',           'Chacarita',    'public', 1,  30, 'hidden',    now()),
  ('a0000000-0000-4000-8000-000000000006', 'sol-naciente',   'Sol Naciente Yoga',   'organization', 'Escuela de yoga y meditación. Talleres intensivos los fines de semana.',   'Núñez',        'public', 6,  21, 'public',    now()),
  ('a0000000-0000-4000-8000-000000000007', 'bruno-teatro',   'Bruno Vidal',         'producer',     'Impro, clown y formación actoral en el Abasto.',                          'Abasto',       'public', 9,  5,  'followers', now())
on conflict (id) do nothing;

insert into public.agendas (owner_id, slug, title, is_primary)
select id, 'principal', 'Agenda principal', true from public.profiles
where id between 'a0000000-0000-4000-8000-000000000001' and 'a0000000-0000-4000-8000-000000000007'
on conflict (owner_id, slug) do nothing;

insert into public.user_preferences (user_id, home_zone, preferred_tags)
values
  ('a0000000-0000-4000-8000-000000000001', 'Palermo',      '{yoga,meditacion}'),
  ('a0000000-0000-4000-8000-000000000002', 'Villa Crespo', '{danza,performance}'),
  ('a0000000-0000-4000-8000-000000000003', 'San Telmo',    '{teatro}'),
  ('a0000000-0000-4000-8000-000000000004', 'Almagro',      '{tango,folclore}'),
  ('a0000000-0000-4000-8000-000000000005', 'Chacarita',    '{teatro,performance}'),
  ('a0000000-0000-4000-8000-000000000006', 'Núñez',        '{yoga,meditacion}'),
  ('a0000000-0000-4000-8000-000000000007', 'Abasto',       '{teatro,impro}')
on conflict (user_id) do nothing;

update public.profiles
set
  instagram_handle = 'anaruizyoga',
  whatsapp_phone = '5491123456789',
  contact_email = 'ana@dummy.test',
  allow_contact = true
where id = 'a0000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Tags y sedes
-- ---------------------------------------------------------------------------
insert into public.tags (slug, name, aliases)
values
  ('yoga',                'Yoga',                  '{yogui,asanas}'),
  ('hatha-yoga',          'Hatha Yoga',            '{hatha}'),
  ('vinyasa',             'Vinyasa',               '{flow}'),
  ('meditacion',          'Meditación',            '{mindfulness,respiracion}'),
  ('danza',               'Danza',                 '{baile}'),
  ('danza-contemporanea', 'Danza contemporánea',   '{contemporaneo}'),
  ('tango',               'Tango',                 '{milonga}'),
  ('folclore',            'Folclore',              '{peña,folklore}'),
  ('teatro',              'Teatro',                '{obra}'),
  ('teatro-independiente','Teatro independiente',  '{off}'),
  ('impro',               'Improvisación',         '{impro-teatral}'),
  ('performance',         'Performance',           '{accion}')
on conflict (slug) do nothing;

insert into public.venues (id, name, address, city, zone, created_by, location)
values
  ('b0000000-0000-4000-8000-000000000001', 'Estudio Luz',    'Gorriti 4500',        'Buenos Aires', 'Palermo',      'a0000000-0000-4000-8000-000000000001', st_setsrid(st_makepoint(-58.4265, -34.5889), 4326)::geography),
  ('b0000000-0000-4000-8000-000000000002', 'Galpón Raíz',    'Av. Corrientes 5200', 'Buenos Aires', 'Villa Crespo', 'a0000000-0000-4000-8000-000000000002', st_setsrid(st_makepoint(-58.4396, -34.5991), 4326)::geography),
  ('b0000000-0000-4000-8000-000000000003', 'Sala El Faro',   'Defensa 900',         'Buenos Aires', 'San Telmo',    'a0000000-0000-4000-8000-000000000003', st_setsrid(st_makepoint(-58.3718, -34.6205), 4326)::geography),
  ('b0000000-0000-4000-8000-000000000004', 'Club Almagro',   'Medrano 700',         'Buenos Aires', 'Almagro',      'a0000000-0000-4000-8000-000000000004', st_setsrid(st_makepoint(-58.4200, -34.6060), 4326)::geography),
  ('b0000000-0000-4000-8000-000000000005', 'Espacio Grieta', 'Jorge Newbery 3500',  'Buenos Aires', 'Chacarita',    'a0000000-0000-4000-8000-000000000005', st_setsrid(st_makepoint(-58.4550, -34.5860), 4326)::geography),
  ('b0000000-0000-4000-8000-000000000006', 'Casa Sol',       'Cabildo 4200',        'Buenos Aires', 'Núñez',        'a0000000-0000-4000-8000-000000000006', st_setsrid(st_makepoint(-58.4620, -34.5450), 4326)::geography),
  ('b0000000-0000-4000-8000-000000000007', 'Sala Abasto',    'Humahuaca 3500',      'Buenos Aires', 'Abasto',       'a0000000-0000-4000-8000-000000000007', st_setsrid(st_makepoint(-58.4110, -34.6030), 4326)::geography)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 20 eventos: 7 de yoga, 7 de danza, 6 de teatro
-- start_offset se mide desde la medianoche de hoy en hora de Buenos Aires.
-- ---------------------------------------------------------------------------
insert into public.events (
  id, author_id, agenda_id, venue_id, slug, title, description_html,
  visibility, editorial_status, starts_at, ends_at, timezone, rrule,
  location_mode, is_free, price_label, capacity, language
)
select
  v.id,
  v.author_id,
  ag.id,
  v.venue_id,
  v.slug,
  v.title,
  v.description,
  v.visibility::event_visibility,
  'published'::editorial_status,
  (base.day0 + v.start_offset) at time zone 'America/Argentina/Buenos_Aires',
  (base.day0 + v.start_offset + v.duration) at time zone 'America/Argentina/Buenos_Aires',
  'America/Argentina/Buenos_Aires',
  v.rrule,
  'physical'::location_mode,
  v.is_free,
  v.price_label,
  v.capacity,
  'es'
from (
  select date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires') as day0
) base
cross join (values
  -- yoga
  ('e0000000-0000-4000-8000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, 'hatha-yoga-al-amanecer',      'Hatha Yoga al amanecer',              '<p>Práctica suave para empezar el día. Todos los niveles.</p>',                       'public', interval '1 day 7 hours',   interval '75 minutes', 'FREQ=WEEKLY;BYDAY=TU', false, '$6.000 la clase',    18),
  ('e0000000-0000-4000-8000-000000000002'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, 'vinyasa-flow-nivel-medio',    'Vinyasa Flow nivel medio',            '<p>Secuencias dinámicas con foco en la respiración.</p>',                             'public', interval '2 days 19 hours', interval '90 minutes', 'FREQ=WEEKLY;BYDAY=TH', false, '$7.000 la clase',    16),
  ('e0000000-0000-4000-8000-000000000003'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, null,                                          'yoga-en-el-parque',           'Yoga en el parque (a la gorra)',      '<p>Clase abierta en los Bosques de Palermo. Traé tu mat.</p>',                        'public', interval '5 days 10 hours', interval '60 minutes', null,                   true,  null,                 40),
  ('e0000000-0000-4000-8000-000000000004'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, 'yoga-para-principiantes',     'Yoga para principiantes',             '<p>Ciclo de 8 encuentros para empezar de cero.</p>',                                  'public', interval '3 days 18 hours', interval '60 minutes', 'FREQ=WEEKLY;BYDAY=WE', false, '$5.500 la clase',    12),
  ('e0000000-0000-4000-8000-000000000005'::uuid, 'a0000000-0000-4000-8000-000000000006'::uuid, 'b0000000-0000-4000-8000-000000000006'::uuid, 'meditacion-y-respiracion',    'Meditación y respiración',            '<p>Pranayama y meditación guiada para cerrar el día.</p>',                            'public', interval '1 day 20 hours',  interval '60 minutes', 'FREQ=WEEKLY;BYDAY=MO', true,  null,                 25),
  ('e0000000-0000-4000-8000-000000000006'::uuid, 'a0000000-0000-4000-8000-000000000006'::uuid, 'b0000000-0000-4000-8000-000000000006'::uuid, 'yoga-restaurativo',           'Yoga restaurativo con sonido',        '<p>Posturas sostenidas acompañadas de cuencos tibetanos.</p>',                        'public', interval '6 days 17 hours', interval '90 minutes', null,                   false, '$9.000',             20),
  ('e0000000-0000-4000-8000-000000000007'::uuid, 'a0000000-0000-4000-8000-000000000006'::uuid, 'b0000000-0000-4000-8000-000000000006'::uuid, 'ashtanga-intensivo',          'Taller intensivo de Ashtanga',        '<p>Dos jornadas sobre la serie primaria. Requiere práctica previa.</p>',              'public', interval '12 days 9 hours', interval '4 hours',    null,                   false, '$25.000 las 2 jornadas', 14),
  -- danza
  ('e0000000-0000-4000-8000-000000000008'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000002'::uuid, 'entrenamiento-contemporaneo', 'Entrenamiento en danza contemporánea','<p>Técnica, piso y composición. Nivel intermedio y avanzado.</p>',                    'public', interval '1 day 18 hours',  interval '2 hours',    'FREQ=WEEKLY;BYDAY=TU', false, '$8.000 la clase',    22),
  ('e0000000-0000-4000-8000-000000000009'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000002'::uuid, 'improvisacion-en-movimiento', 'Improvisación en movimiento',         '<p>Laboratorio abierto de improvisación y contact.</p>',                              'public', interval '4 days 19 hours', interval '2 hours',    null,                   false, '$6.500',             20),
  ('e0000000-0000-4000-8000-00000000000a'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000002'::uuid, 'muestra-fin-de-ciclo',        'Muestra de fin de ciclo',             '<p>Los grupos del año presentan sus trabajos en proceso.</p>',                        'public', interval '20 days 20 hours',interval '2 hours',    null,                   true,  null,                 80),
  ('e0000000-0000-4000-8000-00000000000b'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000002'::uuid, 'laboratorio-coreografico',    'Laboratorio de composición coreográfica','<p>Cuatro encuentros para armar una pieza corta propia.</p>',                      'shared', interval '9 days 17 hours', interval '3 hours',    null,                   false, '$18.000 el ciclo',   15),
  ('e0000000-0000-4000-8000-00000000000c'::uuid, 'a0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000004'::uuid, 'milonga-la-almagrena',        'Milonga La Almagreña',                '<p>Clase a las 21 y baile hasta las 3. Orquesta en vivo una vez por mes.</p>',        'public', interval '4 days 21 hours', interval '5 hours',    'FREQ=WEEKLY;BYDAY=FR', false, '$5.000 con clase',   120),
  ('e0000000-0000-4000-8000-00000000000d'::uuid, 'a0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000004'::uuid, 'tango-para-dos',              'Clase de tango para dos',             '<p>Para parejas que arrancan. No hace falta experiencia.</p>',                        'public', interval '3 days 20 hours', interval '90 minutes', 'FREQ=WEEKLY;BYDAY=WE', false, '$10.000 la pareja',  20),
  ('e0000000-0000-4000-8000-00000000000e'::uuid, 'a0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000004'::uuid, 'pena-abierta',                'Peña abierta de folclore',            '<p>Zamba, chacarera y guitarreada. Se toca y se baila.</p>',                          'public', interval '13 days 21 hours',interval '4 hours',    null,                   true,  null,                 90),
  -- teatro
  ('e0000000-0000-4000-8000-00000000000f'::uuid, 'a0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000003'::uuid, 'la-casa-sin-techo',           'La casa sin techo',                   '<p>Drama familiar en un solo acto. Temporada de 8 funciones.</p>',                    'public', interval '5 days 21 hours', interval '80 minutes', 'FREQ=WEEKLY;BYDAY=SA', false, '$12.000',            90),
  ('e0000000-0000-4000-8000-000000000010'::uuid, 'a0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000003'::uuid, 'los-dias-iguales',            'Los días iguales',                    '<p>Comedia sobre la rutina de tres hermanas en una pensión.</p>',                     'public', interval '6 days 19 hours', interval '70 minutes', 'FREQ=WEEKLY;BYDAY=SU', false, '$12.000',            90),
  ('e0000000-0000-4000-8000-000000000011'::uuid, 'a0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000003'::uuid, 'ciclo-teatro-breve',          'Ciclo de teatro breve',               '<p>Cuatro obras cortas por noche, distintas cada semana.</p>',                        'public', interval '2 days 21 hours', interval '2 hours',    'FREQ=WEEKLY;BYDAY=TH', false, '$8.000',             70),
  ('e0000000-0000-4000-8000-000000000012'::uuid, 'a0000000-0000-4000-8000-000000000005'::uuid, 'b0000000-0000-4000-8000-000000000005'::uuid, 'grieta-estreno',              'Grieta (estreno)',                    '<p>Estreno de la nueva obra de la compañía. Función con charla al final.</p>',        'public', interval '11 days 20 hours',interval '90 minutes', null,                   false, '$14.000',            60),
  ('e0000000-0000-4000-8000-000000000013'::uuid, 'a0000000-0000-4000-8000-000000000007'::uuid, 'b0000000-0000-4000-8000-000000000007'::uuid, 'impro-match',                 'Impro Match',                         '<p>Dos equipos, el público decide. Formato deportivo de improvisación.</p>',          'public', interval '4 days 22 hours', interval '90 minutes', 'FREQ=WEEKLY;BYDAY=FR', false, '$9.000',             100),
  ('e0000000-0000-4000-8000-000000000014'::uuid, 'a0000000-0000-4000-8000-000000000007'::uuid, 'b0000000-0000-4000-8000-000000000007'::uuid, 'taller-de-clown',             'Taller de clown',                     '<p>Encuentro único de iniciación al clown. Ropa cómoda.</p>',                         'shared', interval '8 days 16 hours', interval '3 hours',    null,                   false, '$11.000',            16)
) as v(id, author_id, venue_id, slug, title, description, visibility, start_offset, duration, rrule, is_free, price_label, capacity)
join public.agendas ag on ag.owner_id = v.author_id and ag.is_primary
on conflict (id) do nothing;

-- Portadas de ejemplo (Unsplash). Yoga/danza en recorte vertical (poster);
-- teatro/música en apaisado, para los dos layouts del detalle.
update public.events e
set cover_image_url = v.url
from (values
  ('e0000000-0000-4000-8000-000000000001'::uuid, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-000000000002'::uuid, 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-000000000003'::uuid, 'https://images.unsplash.com/photo-1593810451137-5dc55105dace?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-000000000004'::uuid, 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-000000000005'::uuid, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-000000000006'::uuid, 'https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-000000000007'::uuid, 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-000000000008'::uuid, 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-000000000009'::uuid, 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-00000000000a'::uuid, 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=1600&h=900&q=80'),
  ('e0000000-0000-4000-8000-00000000000b'::uuid, 'https://images.unsplash.com/photo-1535525153412-5a76f2d1c3c8?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-00000000000c'::uuid, 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&h=900&q=80'),
  ('e0000000-0000-4000-8000-00000000000d'::uuid, 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&h=1200&q=80'),
  ('e0000000-0000-4000-8000-00000000000e'::uuid, 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1600&h=900&q=80'),
  ('e0000000-0000-4000-8000-00000000000f'::uuid, 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1600&h=900&q=80'),
  ('e0000000-0000-4000-8000-000000000010'::uuid, 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=1600&h=900&q=80'),
  ('e0000000-0000-4000-8000-000000000011'::uuid, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&h=900&q=80'),
  ('e0000000-0000-4000-8000-000000000012'::uuid, 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&h=900&q=80'),
  ('e0000000-0000-4000-8000-000000000013'::uuid, 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&h=900&q=80'),
  ('e0000000-0000-4000-8000-000000000014'::uuid, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&h=900&q=80')
) as v(id, url)
where e.id = v.id;

-- Ocurrencias: una sola para los eventos puntuales, 8 semanas para los recurrentes.
insert into public.event_occurrences (event_id, starts_at, ends_at, all_day, timezone)
select
  e.id,
  e.starts_at + (n * interval '7 days'),
  e.ends_at + (n * interval '7 days'),
  e.all_day,
  e.timezone
from public.events e
cross join generate_series(0, case when e.rrule is null then 0 else 7 end) as n
where e.author_id between 'a0000000-0000-4000-8000-000000000001' and 'a0000000-0000-4000-8000-000000000007'
on conflict (event_id, starts_at) do nothing;

insert into public.event_tags (event_id, tag_id)
select v.event_id, t.id
from (values
  ('e0000000-0000-4000-8000-000000000001'::uuid, '{yoga,hatha-yoga}'::text[]),
  ('e0000000-0000-4000-8000-000000000002'::uuid, '{yoga,vinyasa}'),
  ('e0000000-0000-4000-8000-000000000003'::uuid, '{yoga}'),
  ('e0000000-0000-4000-8000-000000000004'::uuid, '{yoga,hatha-yoga}'),
  ('e0000000-0000-4000-8000-000000000005'::uuid, '{meditacion,yoga}'),
  ('e0000000-0000-4000-8000-000000000006'::uuid, '{yoga,meditacion}'),
  ('e0000000-0000-4000-8000-000000000007'::uuid, '{yoga}'),
  ('e0000000-0000-4000-8000-000000000008'::uuid, '{danza,danza-contemporanea}'),
  ('e0000000-0000-4000-8000-000000000009'::uuid, '{danza,danza-contemporanea,performance}'),
  ('e0000000-0000-4000-8000-00000000000a'::uuid, '{danza,danza-contemporanea}'),
  ('e0000000-0000-4000-8000-00000000000b'::uuid, '{danza,performance}'),
  ('e0000000-0000-4000-8000-00000000000c'::uuid, '{danza,tango}'),
  ('e0000000-0000-4000-8000-00000000000d'::uuid, '{danza,tango}'),
  ('e0000000-0000-4000-8000-00000000000e'::uuid, '{danza,folclore}'),
  ('e0000000-0000-4000-8000-00000000000f'::uuid, '{teatro}'),
  ('e0000000-0000-4000-8000-000000000010'::uuid, '{teatro}'),
  ('e0000000-0000-4000-8000-000000000011'::uuid, '{teatro,teatro-independiente}'),
  ('e0000000-0000-4000-8000-000000000012'::uuid, '{teatro,teatro-independiente}'),
  ('e0000000-0000-4000-8000-000000000013'::uuid, '{teatro,impro}'),
  ('e0000000-0000-4000-8000-000000000014'::uuid, '{teatro,impro}')
) as v(event_id, tag_slugs)
join public.tags t on t.slug = any (v.tag_slugs)
on conflict (event_id, tag_id) do nothing;

-- ---------------------------------------------------------------------------
-- Red: follows y una agenda compuesta con atribución al autor original
-- ---------------------------------------------------------------------------
insert into public.follows (follower_id, following_id)
values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006'),
  ('a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000005'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007'),
  ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002')
on conflict (follower_id, following_id) do nothing;

-- El Faro agrega la programación pública de La Grieta y de Bruno a su propia agenda.
insert into public.agenda_sources (agenda_id, source_profile_id, mode, enabled)
select ag.id, src, 'all_public', true
from public.agendas ag
cross join (values
  ('a0000000-0000-4000-8000-000000000005'::uuid),
  ('a0000000-0000-4000-8000-000000000007'::uuid)
) as s(src)
where ag.owner_id = 'a0000000-0000-4000-8000-000000000003' and ag.is_primary
on conflict do nothing;
