-- Realtime needs full row data so postgres_changes can filter on store_slug.
alter table api.menu_snapshots replica identity full;
