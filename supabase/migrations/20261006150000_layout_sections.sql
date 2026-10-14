-- Layout sections group screen components: a row in portrait, a column in landscape.

create table if not exists api.menu_layout_sections (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references api.menus(id) on delete cascade,
  name text not null default 'Sección',
  sort_order int not null default 0
);

alter table api.menu_sections
  add column if not exists layout_section_id uuid references api.menu_layout_sections(id) on delete set null;

insert into api.menu_layout_sections (menu_id, name, sort_order)
select m.id, 'Sección 1', 0
from api.menus m
where not exists (
  select 1 from api.menu_layout_sections s where s.menu_id = m.id
);

update api.menu_sections ms
set layout_section_id = ls.id
from api.menu_layout_sections ls
where ls.menu_id = ms.menu_id
  and ms.layout_section_id is null;

alter table api.menu_layout_sections enable row level security;

drop policy if exists "members read layout sections" on api.menu_layout_sections;
create policy "members read layout sections"
  on api.menu_layout_sections for select
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = menu_layout_sections.menu_id
        and api.is_store_member(m.store_id)
    )
  );

drop policy if exists "members write layout sections" on api.menu_layout_sections;
create policy "members write layout sections"
  on api.menu_layout_sections for all
  to authenticated
  using (
    exists (
      select 1 from api.menus m
      where m.id = menu_layout_sections.menu_id
        and api.is_store_member(m.store_id)
    )
  )
  with check (
    exists (
      select 1 from api.menus m
      where m.id = menu_layout_sections.menu_id
        and api.is_store_member(m.store_id)
    )
  );

grant all on api.menu_layout_sections to service_role;

notify pgrst, 'reload schema';
