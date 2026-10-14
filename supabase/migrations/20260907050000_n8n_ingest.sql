-- n8n ingest: sender allowlist + command_log policies.
-- n8n never writes Postgres; Next.js /api/n8n/ingest does.

create table if not exists api.store_senders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references api.stores(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email')),
  sender text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (store_id, channel, sender)
);

create index if not exists store_senders_store_idx
  on api.store_senders (store_id);

alter table api.store_senders enable row level security;

alter table api.command_log
  add column if not exists reply text;

create index if not exists command_log_store_created_idx
  on api.command_log (store_id, created_at desc);

drop policy if exists "members read senders" on api.store_senders;
create policy "members read senders"
  on api.store_senders for select
  to authenticated
  using (api.is_store_member(store_id));

drop policy if exists "members write senders" on api.store_senders;
create policy "members write senders"
  on api.store_senders for all
  to authenticated
  using (api.is_store_member(store_id))
  with check (api.is_store_member(store_id));

drop policy if exists "members read commands" on api.command_log;
create policy "members read commands"
  on api.command_log for select
  to authenticated
  using (api.is_store_member(store_id));

drop policy if exists "members insert commands" on api.command_log;
create policy "members insert commands"
  on api.command_log for insert
  to authenticated
  with check (api.is_store_member(store_id));

drop policy if exists "members read media" on api.media_assets;
create policy "members read media"
  on api.media_assets for select
  to authenticated
  using (api.is_store_member(store_id));

drop policy if exists "members write media" on api.media_assets;
create policy "members write media"
  on api.media_assets for all
  to authenticated
  using (api.is_store_member(store_id))
  with check (api.is_store_member(store_id));

grant select, insert, update, delete on api.store_senders to authenticated;
grant select, insert, update on api.command_log to authenticated;
grant all on api.store_senders to service_role;
grant all on api.command_log to service_role;

notify pgrst, 'reload schema';
