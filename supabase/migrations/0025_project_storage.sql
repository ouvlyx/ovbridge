-- Stockage partage et chiffrement independants des espaces personnels.

alter table ovbridge.ovbridge_spaces
  add column if not exists storage_quota_bytes bigint not null default 1073741824,
  add column if not exists storage_used_bytes bigint not null default 0;

revoke update on ovbridge.ovbridge_spaces from anon, authenticated;
grant update (name, description)
  on ovbridge.ovbridge_spaces to authenticated;

create table if not exists ovbridge.ovbridge_project_keys (
  space_id uuid not null references ovbridge.ovbridge_spaces(id) on delete cascade,
  device_id uuid not null references ovbridge.ovbridge_devices(id) on delete cascade,
  wrapped_key text not null,
  nonce text not null,
  wrapped_by_public_key text not null,
  created_at timestamptz not null default now(),
  primary key (space_id, device_id)
);

alter table ovbridge.ovbridge_project_keys enable row level security;

drop policy if exists "project_keys: select project members"
  on ovbridge.ovbridge_project_keys;
create policy "project_keys: select project members"
  on ovbridge.ovbridge_project_keys for select
  using (ovbridge.ovbridge_is_member(space_id, auth.uid()));

drop policy if exists "project_keys: insert for active project devices"
  on ovbridge.ovbridge_project_keys;
create policy "project_keys: insert for active project devices"
  on ovbridge.ovbridge_project_keys for insert
  with check (
    ovbridge.ovbridge_is_admin(space_id, auth.uid())
    and exists (
      select 1
      from ovbridge.ovbridge_space_members m
      join ovbridge.ovbridge_devices d on d.user_id = m.user_id
      where m.space_id = ovbridge_project_keys.space_id
        and d.id = device_id
        and d.approved
        and not d.revoked
    )
    and exists (
      select 1
      from ovbridge.ovbridge_devices sender
      where sender.user_id = auth.uid()
        and sender.public_key = wrapped_by_public_key
        and sender.approved
        and not sender.revoked
    )
  );

create or replace function ovbridge.ovbridge_project_member_key_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ovbridge, public
as $$
begin
  delete from ovbridge.ovbridge_project_keys k
  using ovbridge.ovbridge_devices d
  where k.space_id = old.space_id
    and k.device_id = d.id
    and d.user_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists ovbridge_project_member_key_cleanup
  on ovbridge.ovbridge_space_members;
create trigger ovbridge_project_member_key_cleanup
  after delete on ovbridge.ovbridge_space_members
  for each row execute function ovbridge.ovbridge_project_member_key_cleanup();

create table if not exists ovbridge.ovbridge_project_files (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references ovbridge.ovbridge_spaces(id) on delete cascade,
  name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes between 0 and 20971520),
  storage_path text not null unique,
  uploaded_by_device uuid references ovbridge.ovbridge_devices(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ovbridge_project_files_space_created_idx
  on ovbridge.ovbridge_project_files(space_id, created_at desc);

alter table ovbridge.ovbridge_project_files enable row level security;

drop policy if exists "project_files: select members"
  on ovbridge.ovbridge_project_files;
create policy "project_files: select members"
  on ovbridge.ovbridge_project_files for select
  using (ovbridge.ovbridge_is_member(space_id, auth.uid()));

drop policy if exists "project_files: insert members own device"
  on ovbridge.ovbridge_project_files;
create policy "project_files: insert members own device"
  on ovbridge.ovbridge_project_files for insert
  with check (
    ovbridge.ovbridge_is_member(space_id, auth.uid())
    and uploaded_by_device is not null
    and exists (
      select 1
      from ovbridge.ovbridge_devices d
      where d.id = uploaded_by_device
        and d.user_id = auth.uid()
        and d.approved
        and not d.revoked
    )
    and storage_path ~ (
      '^project/' || space_id::text || '/' || auth.uid()::text ||
      '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]enc$'
    )
  );

drop policy if exists "project_files: delete members"
  on ovbridge.ovbridge_project_files;
create policy "project_files: delete members"
  on ovbridge.ovbridge_project_files for delete
  using (ovbridge.ovbridge_is_member(space_id, auth.uid()));

create or replace function ovbridge.ovbridge_project_devices(p_space_id uuid)
returns table (device_id uuid, public_key text)
language sql
security definer
set search_path = ovbridge, public
as $$
  select d.id, d.public_key
  from ovbridge.ovbridge_devices d
  join ovbridge.ovbridge_space_members m on m.user_id = d.user_id
  where m.space_id = p_space_id
    and d.approved
    and not d.revoked
    and ovbridge.ovbridge_is_member(p_space_id, auth.uid());
$$;

revoke all on function ovbridge.ovbridge_project_devices(uuid) from public, anon;
grant execute on function ovbridge.ovbridge_project_devices(uuid) to authenticated;

create or replace function ovbridge.ovbridge_project_file_usage()
returns trigger
language plpgsql
security definer
set search_path = ovbridge, public
as $$
begin
  if tg_op = 'INSERT' then
    update ovbridge.ovbridge_spaces
      set storage_used_bytes = storage_used_bytes + new.size_bytes
      where id = new.space_id
        and storage_used_bytes + new.size_bytes <= storage_quota_bytes;
    if not found then
      raise exception 'Espace projet introuvable ou quota de stockage dépassé';
    end if;
    return new;
  end if;

  update ovbridge.ovbridge_spaces
    set storage_used_bytes = greatest(0, storage_used_bytes - old.size_bytes)
    where id = old.space_id;
  return old;
end;
$$;

drop trigger if exists ovbridge_project_files_usage_insert
  on ovbridge.ovbridge_project_files;
create trigger ovbridge_project_files_usage_insert
  before insert on ovbridge.ovbridge_project_files
  for each row execute function ovbridge.ovbridge_project_file_usage();

drop trigger if exists ovbridge_project_files_usage_delete
  on ovbridge.ovbridge_project_files;
create trigger ovbridge_project_files_usage_delete
  after delete on ovbridge.ovbridge_project_files
  for each row execute function ovbridge.ovbridge_project_file_usage();

drop policy if exists "project_storage: insert members" on storage.objects;
create policy "project_storage: insert members"
  on storage.objects for insert
  with check (
    bucket_id = 'ovbridge_files'
    and split_part(name, '/', 1) = 'project'
    and split_part(name, '/', 3) = auth.uid()::text
    and case
      when split_part(name, '/', 2) ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ovbridge.ovbridge_is_member(
        split_part(name, '/', 2)::uuid,
        auth.uid()
      )
      and exists (
        select 1
        from ovbridge.ovbridge_project_files f
        where f.storage_path = name
          and f.space_id = split_part(name, '/', 2)::uuid
      )
      else false
    end
  );

drop policy if exists "project_storage: select file members" on storage.objects;
create policy "project_storage: select file members"
  on storage.objects for select
  using (
    bucket_id = 'ovbridge_files'
    and exists (
      select 1
      from ovbridge.ovbridge_project_files f
      where f.storage_path = name
        and ovbridge.ovbridge_is_member(f.space_id, auth.uid())
    )
  );

drop policy if exists "project_storage: delete file members" on storage.objects;
create policy "project_storage: delete file members"
  on storage.objects for delete
  using (
    bucket_id = 'ovbridge_files'
    and split_part(name, '/', 1) = 'project'
    and case
      when split_part(name, '/', 2) ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ovbridge.ovbridge_is_member(
        split_part(name, '/', 2)::uuid,
        auth.uid()
      )
      else false
    end
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'ovbridge'
      and tablename = 'ovbridge_project_files'
  ) then
    alter publication supabase_realtime
      add table ovbridge.ovbridge_project_files;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'ovbridge'
      and tablename = 'ovbridge_spaces'
  ) then
    alter publication supabase_realtime
      add table ovbridge.ovbridge_spaces;
  end if;
end
$$;
