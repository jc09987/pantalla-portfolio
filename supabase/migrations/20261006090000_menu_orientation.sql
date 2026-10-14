alter table api.menus
  add column if not exists orientation text;

update api.menus
set orientation = case
  when theme->>'orientation' in ('portrait', 'landscape') then theme->>'orientation'
  else coalesce(orientation, 'landscape')
end
where orientation is null
   or orientation not in ('portrait', 'landscape');

alter table api.menus
  alter column orientation set default 'landscape';

update api.menus
set orientation = 'landscape'
where orientation is null;

alter table api.menus
  alter column orientation set not null;

alter table api.menus
  drop constraint if exists menus_orientation_check;

alter table api.menus
  add constraint menus_orientation_check
  check (orientation in ('landscape', 'portrait'));
