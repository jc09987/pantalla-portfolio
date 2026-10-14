-- Multiple photos per product, used as carousels / promo rows on the TV.

create table if not exists api.menu_item_media (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references api.menu_items(id) on delete cascade,
  media_id uuid references api.media_assets(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists menu_item_media_item_media_uidx
  on api.menu_item_media (item_id, media_id)
  where media_id is not null;

create index if not exists menu_item_media_item_idx
  on api.menu_item_media (item_id, sort_order);

alter table api.menu_items
  add column if not exists media_id uuid references api.media_assets(id) on delete set null;

insert into api.menu_item_media (item_id, media_id, image_url, sort_order)
select i.id, a.id, i.image_url, 0
from api.menu_items i
left join api.media_assets a on a.blob_url = i.image_url
where i.image_url is not null
  and not exists (
    select 1 from api.menu_item_media m where m.item_id = i.id
  );

alter table api.menu_item_media enable row level security;

drop policy if exists "members read item media" on api.menu_item_media;
create policy "members read item media"
  on api.menu_item_media for select
  to authenticated
  using (
    exists (
      select 1
      from api.menu_items i
      join api.menu_sections s on s.id = i.section_id
      join api.menus m on m.id = s.menu_id
      where i.id = menu_item_media.item_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members write item media" on api.menu_item_media;
create policy "members write item media"
  on api.menu_item_media for all
  to authenticated
  using (
    exists (
      select 1
      from api.menu_items i
      join api.menu_sections s on s.id = i.section_id
      join api.menus m on m.id = s.menu_id
      where i.id = menu_item_media.item_id
        and api.is_store_member(m.store_id)
    )
  )
  with check (
    exists (
      select 1
      from api.menu_items i
      join api.menu_sections s on s.id = i.section_id
      join api.menus m on m.id = s.menu_id
      where i.id = menu_item_media.item_id
        and api.is_store_member(m.store_id)
    )
  );

grant select, insert, update, delete on api.menu_item_media to authenticated;
grant all on api.menu_item_media to service_role;

notify pgrst, 'reload schema';
