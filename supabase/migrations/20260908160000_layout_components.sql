-- Layout sections can be product lists, carousels, promo strips, prices, or featured heroes.

alter table api.menu_sections
  add column if not exists component text not null default 'products';

update api.menu_sections
set component = 'products'
where component is null or btrim(component) = '';

notify pgrst, 'reload schema';
