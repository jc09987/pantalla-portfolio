-- Media library: unique blob path, optional media_id on catalog slots.

create unique index if not exists media_assets_pathname_uidx
  on api.media_assets (blob_pathname);

alter table api.hero_spots
  add column if not exists media_id uuid references api.media_assets(id) on delete set null;

alter table api.menu_items
  add column if not exists media_id uuid references api.media_assets(id) on delete set null;

alter table api.price_tiers
  add column if not exists media_id uuid references api.media_assets(id) on delete set null;

create index if not exists hero_spots_media_idx on api.hero_spots (media_id);
create index if not exists menu_items_media_idx on api.menu_items (media_id);
create index if not exists price_tiers_media_idx on api.price_tiers (media_id);

notify pgrst, 'reload schema';
