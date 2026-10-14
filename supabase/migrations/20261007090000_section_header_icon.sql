-- Optional icon for product-list headers. Theme JSON remains the fallback if this
-- column is not applied remotely.

alter table api.menu_sections
  add column if not exists header_icon text;

notify pgrst, 'reload schema';
