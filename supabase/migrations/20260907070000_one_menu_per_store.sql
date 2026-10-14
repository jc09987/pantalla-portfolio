-- Extra api.menus rows from the earlier maybeSingle() lookup left stores with
-- more than one catalog. Publishing a second row hits menus_one_published_per_store.
-- Drop empty duplicates; keep the filled published menu as the canonical draft.

delete from api.menus m
where not exists (
  select 1 from api.menu_sections s where s.menu_id = m.id
)
and exists (
  select 1
  from api.menus other
  where other.store_id = m.store_id
    and other.id <> m.id
    and exists (
      select 1 from api.menu_sections s2 where s2.menu_id = other.id
    )
);

update api.menus m
set is_published = false
where m.is_published
  and exists (
    select 1
    from api.menus other
    where other.store_id = m.store_id
      and other.id <> m.id
      and other.is_published
      and other.updated_at > m.updated_at
  );
