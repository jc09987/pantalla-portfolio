-- Multi-tenant Pantalla: any business can own a store, invite a team, and brand it.
-- La Michoacana stays a normal row in api.stores.

alter table api.stores
  add column if not exists logo_url text;

alter table api.store_members
  add column if not exists email text;

update api.store_members sm
set email = u.email
from auth.users u
where u.id = sm.user_id
  and (sm.email is null or sm.email = '');

alter table api.store_members
  drop constraint if exists store_members_role_check;

alter table api.store_members
  add constraint store_members_role_check
  check (role in ('owner', 'admin', 'editor'));

create table if not exists api.store_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references api.stores(id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz
);

create unique index if not exists store_invites_pending_email
  on api.store_invites (store_id, lower(email))
  where accepted_at is null;

alter table api.store_invites enable row level security;

create or replace function api.current_user_email()
returns text
language sql
stable
security definer
set search_path = auth, api
as $$
  select email
  from auth.users
  where id = auth.uid();
$$;

revoke all on function api.current_user_email() from public;
grant execute on function api.current_user_email() to authenticated;

create or replace function api.is_store_manager(p_store_id uuid)
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
      and role in ('owner', 'admin')
  );
$$;

revoke all on function api.is_store_manager(uuid) from public;
grant execute on function api.is_store_manager(uuid) to authenticated;

create or replace function api.accept_pending_invites()
returns int
language plpgsql
security definer
set search_path = api, auth
as $$
declare
  uid uuid := auth.uid();
  mail text;
  accepted int := 0;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select u.email into mail from auth.users u where u.id = uid;
  if mail is null or mail = '' then
    return 0;
  end if;

  insert into api.store_members (store_id, user_id, role, email)
  select i.store_id, uid, i.role, mail
  from api.store_invites i
  where i.accepted_at is null
    and i.expires_at > now()
    and lower(i.email) = lower(mail)
  on conflict (store_id, user_id) do nothing;

  get diagnostics accepted = row_count;

  update api.store_invites i
  set accepted_at = now()
  where i.accepted_at is null
    and i.expires_at > now()
    and lower(i.email) = lower(mail);

  update api.store_members sm
  set email = mail
  where sm.user_id = uid
    and (sm.email is null or sm.email = '');

  return accepted;
end;
$$;

revoke all on function api.accept_pending_invites() from public;
grant execute on function api.accept_pending_invites() to authenticated;

drop function if exists api.ensure_my_store();
drop function if exists api.ensure_my_store(uuid);

create function api.ensure_my_store(p_store_id uuid default null)
returns table (store_id uuid, store_slug text, store_name text)
language plpgsql
security definer
set search_path = api, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform api.accept_pending_invites();

  if p_store_id is not null then
    return query
    select st.id, st.slug, st.name
    from api.store_members sm
    join api.stores st on st.id = sm.store_id
    where sm.user_id = uid
      and st.id = p_store_id
    limit 1;
    if found then
      return;
    end if;
  end if;

  return query
  select st.id, st.slug, st.name
  from api.store_members sm
  join api.stores st on st.id = sm.store_id
  where sm.user_id = uid
  order by sm.created_at
  limit 1;
end;
$$;

revoke all on function api.ensure_my_store(uuid) from public;
grant execute on function api.ensure_my_store(uuid) to authenticated;

create or replace function api.create_my_store(p_name text, p_slug text)
returns table (store_id uuid, store_slug text, store_name text)
language plpgsql
security definer
set search_path = api, auth
as $$
declare
  uid uuid := auth.uid();
  mail text;
  sid uuid;
  clean_name text := trim(p_name);
  clean_slug text := lower(trim(p_slug));
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if char_length(clean_name) < 2 or char_length(clean_name) > 60 then
    raise exception 'El nombre debe tener entre 2 y 60 caracteres.';
  end if;

  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(clean_slug) < 3 or char_length(clean_slug) > 40 then
    raise exception 'La URL debe ser minúsculas, números y guiones (3 a 40 caracteres).';
  end if;

  if exists (select 1 from api.stores st where st.slug = clean_slug) then
    raise exception 'Esa URL ya está en uso.';
  end if;

  select u.email into mail from auth.users u where u.id = uid;

  insert into api.stores as s (slug, name)
  values (clean_slug, clean_name)
  returning s.id into sid;

  insert into api.store_members (store_id, user_id, role, email)
  values (sid, uid, 'owner', mail)
  on conflict do nothing;

  return query
  select st.id, st.slug, st.name
  from api.stores st
  where st.id = sid;
end;
$$;

revoke all on function api.create_my_store(text, text) from public;
grant execute on function api.create_my_store(text, text) to authenticated;

create or replace function api.invite_to_store(p_store_id uuid, p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = api, auth
as $$
declare
  uid uuid := auth.uid();
  mail text := lower(trim(p_email));
  next_role text := coalesce(nullif(trim(p_role), ''), 'editor');
  invite_id uuid;
  my_role text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if mail !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'Correo inválido.';
  end if;

  if next_role not in ('owner', 'admin', 'editor') then
    raise exception 'Rol inválido.';
  end if;

  select sm.role into my_role
  from api.store_members sm
  where sm.store_id = p_store_id
    and sm.user_id = uid;

  if my_role is null then
    raise exception 'No perteneces a esta tienda.';
  end if;

  if my_role not in ('owner', 'admin') then
    raise exception 'Solo un dueño o admin puede invitar.';
  end if;

  if next_role = 'owner' and my_role <> 'owner' then
    raise exception 'Solo un dueño puede invitar a otro dueño.';
  end if;

  if exists (
    select 1 from api.store_members sm
    where sm.store_id = p_store_id
      and lower(sm.email) = mail
  ) then
    raise exception 'Esa persona ya está en el equipo.';
  end if;

  select i.id into invite_id
  from api.store_invites i
  where i.store_id = p_store_id
    and lower(i.email) = mail
    and i.accepted_at is null
  limit 1;

  if invite_id is not null then
    update api.store_invites i
    set role = next_role,
        invited_by = uid,
        expires_at = now() + interval '14 days'
    where i.id = invite_id;
  else
    insert into api.store_invites (store_id, email, role, invited_by)
    values (p_store_id, mail, next_role, uid)
    returning id into invite_id;
  end if;

  if invite_id is null then
    raise exception 'No se pudo crear la invitación.';
  end if;

  return invite_id;
end;
$$;

revoke all on function api.invite_to_store(uuid, text, text) from public;
grant execute on function api.invite_to_store(uuid, text, text) to authenticated;

drop policy if exists "members read invites" on api.store_invites;
create policy "members read invites"
  on api.store_invites for select
  to authenticated
  using (api.is_store_member(store_id));

drop policy if exists "managers write invites" on api.store_invites;
create policy "managers write invites"
  on api.store_invites for all
  to authenticated
  using (api.is_store_manager(store_id))
  with check (api.is_store_manager(store_id));

drop policy if exists "managers write membership" on api.store_members;
create policy "managers write membership"
  on api.store_members for insert
  to authenticated
  with check (api.is_store_manager(store_id));

drop policy if exists "managers update membership" on api.store_members;
create policy "managers update membership"
  on api.store_members for update
  to authenticated
  using (api.is_store_manager(store_id))
  with check (api.is_store_manager(store_id));

drop policy if exists "managers delete membership" on api.store_members;
create policy "managers delete membership"
  on api.store_members for delete
  to authenticated
  using (api.is_store_manager(store_id));

grant select, insert, update, delete on api.store_invites to authenticated;
grant all on api.store_invites to service_role;

notify pgrst, 'reload schema';
