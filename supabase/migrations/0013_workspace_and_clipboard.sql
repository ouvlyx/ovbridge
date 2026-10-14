-- =====================================================
-- OvBridge — Migration 0013: Workspace & Clipboard partagé
-- =====================================================

-- ---------- 1. CLIPBOARD PARTAGÉ ----------
create table if not exists ovbridge.ovbridge_clipboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_device_id uuid not null references ovbridge.ovbridge_devices(id) on delete cascade,
  content_encrypted text not null,
  nonce text not null,
  preview text,
  kind text not null default 'text' check (kind in ('text', 'url', 'password', 'code')),
  created_at timestamptz default now() not null,
  expires_at timestamptz
);

create index if not exists ovbridge_clipboard_user_id_idx on ovbridge.ovbridge_clipboard(user_id);
create index if not exists ovbridge_clipboard_created_at_idx on ovbridge.ovbridge_clipboard(created_at desc);

alter table ovbridge.ovbridge_clipboard enable row level security;

create policy "ovbridge_clipboard: select own"
  on ovbridge.ovbridge_clipboard for select
  using (auth.uid() = user_id);

create policy "ovbridge_clipboard: insert own"
  on ovbridge.ovbridge_clipboard for insert
  with check (auth.uid() = user_id);

create policy "ovbridge_clipboard: delete own"
  on ovbridge.ovbridge_clipboard for delete
  using (auth.uid() = user_id);

alter publication supabase_realtime add table ovbridge.ovbridge_clipboard;

-- ---------- 2. WORKSPACES (Espaces personnels) ----------
create table if not exists ovbridge.ovbridge_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quota_bytes bigint not null default 104857600, -- 100 Mo par défaut
  used_bytes bigint not null default 0,
  created_at timestamptz default now() not null
);

create index if not exists ovbridge_workspaces_owner_id_idx on ovbridge.ovbridge_workspaces(owner_id);

alter table ovbridge.ovbridge_workspaces enable row level security;

create policy "ovbridge_workspaces: select own"
  on ovbridge.ovbridge_workspaces for select
  using (auth.uid() = owner_id);

create policy "ovbridge_workspaces: insert own"
  on ovbridge.ovbridge_workspaces for insert
  with check (auth.uid() = owner_id);

create policy "ovbridge_workspaces: update own"
  on ovbridge.ovbridge_workspaces for update
  using (auth.uid() = owner_id);

create policy "ovbridge_workspaces: delete own"
  on ovbridge.ovbridge_workspaces for delete
  using (auth.uid() = owner_id);

alter publication supabase_realtime add table ovbridge.ovbridge_workspaces;

-- ---------- 3. WORKSPACE FILES ----------
create table if not exists ovbridge.ovbridge_workspace_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references ovbridge.ovbridge_workspaces(id) on delete cascade,
  name text not null,
  mime_type text,
  size_bytes bigint not null,
  storage_path text not null,
  encrypted_key text not null,
  nonce text not null,
  content_hash text,
  uploaded_by_device uuid references ovbridge.ovbridge_devices(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

create index if not exists ovbridge_workspace_files_ws_idx on ovbridge.ovbridge_workspace_files(workspace_id);

alter table ovbridge.ovbridge_workspace_files enable row level security;

create policy "ovbridge_workspace_files: select own"
  on ovbridge.ovbridge_workspace_files for select
  using (
    exists (
      select 1 from ovbridge.ovbridge_workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "ovbridge_workspace_files: insert own"
  on ovbridge.ovbridge_workspace_files for insert
  with check (
    exists (
      select 1 from ovbridge.ovbridge_workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "ovbridge_workspace_files: update own"
  on ovbridge.ovbridge_workspace_files for update
  using (
    exists (
      select 1 from ovbridge.ovbridge_workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "ovbridge_workspace_files: delete own"
  on ovbridge.ovbridge_workspace_files for delete
  using (
    exists (
      select 1 from ovbridge.ovbridge_workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

-- ---------- 4. RPC AJOUT USAGE WORKSPACE ----------
create or replace function ovbridge.ovbridge_add_workspace_usage(
  p_workspace_id uuid,
  p_delta bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update ovbridge.ovbridge_workspaces
  set used_bytes = greatest(0, used_bytes + p_delta)
  where id = p_workspace_id and owner_id = auth.uid();
end;
$$;

revoke all on function ovbridge.ovbridge_add_workspace_usage(uuid, bigint) from public;
grant execute on function ovbridge.ovbridge_add_workspace_usage(uuid, bigint) to authenticated;
