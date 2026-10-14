-- Admin CRM: membership, write RLS, extra catalog columns.

create table if not exists api.store_members (
  store_id uuid not null references api.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

alter table api.store_members enable row level security;

alter table api.price_tiers
  add column if not exists scoop_colors jsonb not null default '[]'::jsonb;

create or replace function api.is_store_member(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = api
as $$
  select exists (
    select 1
    from api.store_members
    where store_id = p_store_id
      and user_id = auth.uid()
  );
$$;

revoke all on function api.is_store_member(uuid) from public;
grant execute on function api.is_store_member(uuid) to authenticated;

create or replace function api.ensure_my_store()
returns table (store_id uuid, store_slug text, store_name text)
language plpgsql
security definer
set search_path = api
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  return query
  select st.id, st.slug, st.name
  from api.store_members sm
  join api.stores st on st.id = sm.store_id
  where sm.user_id = uid
  limit 1;

  if found then
    return;
  end if;

  if exists (select 1 from api.store_members) then
    raise exception 'no store membership';
  end if;

  select st.id
    into sid
  from api.stores st
  where st.slug = 'la-michoacana';

  if sid is null then
    insert into api.stores as s (slug, name)
    values ('la-michoacana', 'La Michoacana')
    returning s.id into sid;
  end if;

  insert into api.store_members (store_id, user_id, role)
  values (sid, uid, 'owner')
  on conflict do nothing;

  return query
  select st.id, st.slug, st.name
  from api.stores st
  where st.id = sid;
end;
$$;

revoke all on function api.ensure_my_store() from public;
grant execute on function api.ensure_my_store() to authenticated;

drop policy if exists "members read membership" on api.store_members;
create policy "members read membership"
  on api.store_members for select
  to authenticated
  using (user_id = auth.uid() or api.is_store_member(store_id));

drop policy if exists "members read stores" on api.stores;
create policy "members read stores"
  on api.stores for select
  to authenticated
  using (api.is_store_member(id));

drop policy if exists "members write stores" on api.stores;
create policy "members write stores"
  on api.stores for update
  to authenticated
  using (api.is_store_member(id))
  with check (api.is_store_member(id));

drop policy if exists "members read menus" on api.menus;
create policy "members read menus"
  on api.menus for select
  to authenticated
  using (api.is_store_member(store_id));

drop policy if exists "members write menus" on api.menus;
create policy "members write menus"
  on api.menus for all
  to authenticated
  using (api.is_store_member(store_id))
  with check (api.is_store_member(store_id));

drop policy if exists "members read tiers" on api.price_tiers;
create policy "members read tiers"
  on api.price_tiers for select
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = price_tiers.menu_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members write tiers" on api.price_tiers;
create policy "members write tiers"
  on api.price_tiers for all
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = price_tiers.menu_id
        and api.is_store_member(m.store_id)
    )
  )
  with check (
    exists (
      select 1 from api.menus m
      where m.id = price_tiers.menu_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members read heroes" on api.hero_spots;
create policy "members read heroes"
  on api.hero_spots for select
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = hero_spots.menu_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members write heroes" on api.hero_spots;
create policy "members write heroes"
  on api.hero_spots for all
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = hero_spots.menu_id
        and api.is_store_member(m.store_id)
    )
  )
  with check (
    exists (
      select 1 from api.menus m
      where m.id = hero_spots.menu_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members read sections" on api.menu_sections;
create policy "members read sections"
  on api.menu_sections for select
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = menu_sections.menu_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members write sections" on api.menu_sections;
create policy "members write sections"
  on api.menu_sections for all
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = menu_sections.menu_id
        and api.is_store_member(m.store_id)
    )
  )
  with check (
    exists (
      select 1 from api.menus m
      where m.id = menu_sections.menu_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members read items" on api.menu_items;
create policy "members read items"
  on api.menu_items for select
  to authenticated
  using (
    exists (
      select 1
      from api.menu_sections s
      join api.menus m on m.id = s.menu_id
      where s.id = menu_items.section_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members write items" on api.menu_items;
create policy "members write items"
  on api.menu_items for all
  to authenticated
  using (
    exists (
      select 1
      from api.menu_sections s
      join api.menus m on m.id = s.menu_id
      where s.id = menu_items.section_id
        and api.is_store_member(m.store_id)
    )
  )
  with check (
    exists (
      select 1
      from api.menu_sections s
      join api.menus m on m.id = s.menu_id
      where s.id = menu_items.section_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members read features" on api.menu_features;
create policy "members read features"
  on api.menu_features for select
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = menu_features.menu_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members write features" on api.menu_features;
create policy "members write features"
  on api.menu_features for all
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = menu_features.menu_id
        and api.is_store_member(m.store_id)
    )
  )
  with check (
    exists (
      select 1 from api.menus m
      where m.id = menu_features.menu_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members write snapshots" on api.menu_snapshots;
create policy "members write snapshots"
  on api.menu_snapshots for insert
  to authenticated
  with check (api.is_store_member(store_id));

drop policy if exists "members update snapshots" on api.menu_snapshots;
create policy "members update snapshots"
  on api.menu_snapshots for update
  to authenticated
  using (api.is_store_member(store_id))
  with check (api.is_store_member(store_id));

grant select, insert, update, delete on all tables in schema api to authenticated;
grant usage, select on all sequences in schema api to authenticated;

notify pgrst, 'reload schema';
