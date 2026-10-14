-- Pantalla v1 schema. Public TVs read api.menu_snapshots only.
-- Add `api` to Exposed schemas in Supabase: Project Settings → API.

create extension if not exists "pgcrypto";

create schema if not exists api;

grant usage on schema api to anon, authenticated, service_role;

create table if not exists api.stores (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  timezone text not null default 'America/Mexico_City',
  locale text not null default 'es-MX',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists api.menus (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references api.stores(id) on delete cascade,
  name text not null,
  layout_key text not null default 'classic-split',
  theme jsonb not null default '{}'::jsonb,
  title text,
  tagline text,
  ribbon text,
  closing text,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists menus_one_published_per_store
  on api.menus (store_id)
  where is_published;

create table if not exists api.price_tiers (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references api.menus(id) on delete cascade,
  label text not null,
  price numeric(10, 2) not null,
  scoop_count int not null default 1,
  image_url text,
  sort_order int not null default 0
);

create table if not exists api.hero_spots (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references api.menus(id) on delete cascade,
  caption text,
  badge text,
  image_url text,
  variant text,
  animation_preset text not null default 'float',
  sort_order int not null default 0
);

create table if not exists api.menu_sections (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references api.menus(id) on delete cascade,
  name text not null,
  kind text not null,
  accent text,
  columns int not null default 2,
  sort_order int not null default 0
);

create table if not exists api.menu_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references api.menu_sections(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  price numeric(10, 2),
  compare_at_price numeric(10, 2),
  discount_type text not null default 'none',
  discount_value numeric(10, 2),
  is_available boolean not null default true,
  badge text,
  animation_preset text,
  animation_delay_ms int not null default 0,
  sort_order int not null default 0
);

create table if not exists api.menu_features (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references api.menus(id) on delete cascade,
  icon text not null,
  label text not null,
  sort_order int not null default 0
);

create table if not exists api.media_assets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references api.stores(id) on delete cascade,
  blob_url text not null,
  blob_pathname text not null,
  mime text,
  width int,
  height int,
  alt text,
  created_at timestamptz not null default now()
);

create table if not exists api.animation_presets (
  key text primary key,
  label text not null,
  tailwind_classes text not null
);

create table if not exists api.menu_snapshots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references api.stores(id) on delete cascade,
  store_slug text not null unique,
  revision int not null default 1,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists api.command_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references api.stores(id) on delete cascade,
  channel text not null,
  sender text,
  raw text,
  parsed jsonb,
  status text not null default 'received',
  created_at timestamptz not null default now()
);

insert into api.animation_presets (key, label, tailwind_classes) values
  ('none', 'None', ''),
  ('float', 'Float', 'anim-float'),
  ('fade-up', 'Fade up', 'anim-fade-up'),
  ('pulse-soft', 'Pulse', 'anim-pulse-soft'),
  ('splash', 'Splash', 'anim-splash'),
  ('ken-burns', 'Ken Burns', 'anim-ken-burns'),
  ('cascade', 'Cascade', 'anim-cascade')
on conflict (key) do nothing;

alter table api.stores enable row level security;
alter table api.menus enable row level security;
alter table api.price_tiers enable row level security;
alter table api.hero_spots enable row level security;
alter table api.menu_sections enable row level security;
alter table api.menu_items enable row level security;
alter table api.menu_features enable row level security;
alter table api.media_assets enable row level security;
alter table api.animation_presets enable row level security;
alter table api.menu_snapshots enable row level security;
alter table api.command_log enable row level security;

create policy "public read snapshots"
  on api.menu_snapshots for select
  to anon, authenticated
  using (true);

create policy "public read presets"
  on api.animation_presets for select
  to anon, authenticated
  using (true);

grant select on all tables in schema api to anon, authenticated;
grant all on all tables in schema api to service_role;
grant usage, select on all sequences in schema api to anon, authenticated, service_role;

alter default privileges in schema api
  grant select on tables to anon, authenticated;
alter default privileges in schema api
  grant all on tables to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'api'
      and tablename = 'menu_snapshots'
  ) then
    execute 'alter publication supabase_realtime add table api.menu_snapshots';
  end if;
end $$;

notify pgrst, 'reload schema';
