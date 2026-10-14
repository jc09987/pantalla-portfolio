-- OUT columns slug/name collided with api.stores in ensure_my_store().
drop function if exists api.ensure_my_store();

create function api.ensure_my_store()
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

notify pgrst, 'reload schema';
