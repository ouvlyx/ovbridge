-- =====================================================
-- OvBridge — Schéma initial (tables préfixées ovbridge_)
-- =====================================================

-- ---------- 1. PROFILES ----------
create table ovbridge.ovbridge_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz default now() not null
);

alter table ovbridge.ovbridge_profiles enable row level security;

create policy "ovbridge_profiles: select own"
  on ovbridge.ovbridge_profiles for select
  using (auth.uid() = id);

create policy "ovbridge_profiles: update own"
  on ovbridge.ovbridge_profiles for update
  using (auth.uid() = id);

-- Trigger : créer un profil automatiquement à l'inscription
create or replace function ovbridge.ovbridge_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into ovbridge.ovbridge_profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger ovbridge_on_auth_user_created
  after insert on auth.users
  for each row execute function ovbridge.ovbridge_handle_new_user();

-- ---------- 2. DEVICES ----------
create table ovbridge.ovbridge_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text,                -- 'web', 'android', 'ios', 'desktop'
  public_key text not null,     -- clé publique libsodium (base64)
  fingerprint text,             -- hash court pour identifier l'appareil
  last_seen timestamptz default now(),
  approved boolean default false,
  revoked boolean default false,
  created_at timestamptz default now() not null
);

create index ovbridge_devices_user_id_idx on ovbridge.ovbridge_devices(user_id);

alter table ovbridge.ovbridge_devices enable row level security;

create policy "ovbridge_devices: select own"
  on ovbridge.ovbridge_devices for select
  using (auth.uid() = user_id);

create policy "ovbridge_devices: insert own"
  on ovbridge.ovbridge_devices for insert
  with check (auth.uid() = user_id);

create policy "ovbridge_devices: update own"
  on ovbridge.ovbridge_devices for update
  using (auth.uid() = user_id);

create policy "ovbridge_devices: delete own"
  on ovbridge.ovbridge_devices for delete
  using (auth.uid() = user_id);

-- ---------- 3. PAIRING TOKENS ----------
create table ovbridge.ovbridge_pairing_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by_device uuid not null references ovbridge.ovbridge_devices(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

create index ovbridge_pairing_tokens_token_idx
  on ovbridge.ovbridge_pairing_tokens(token);

alter table ovbridge.ovbridge_pairing_tokens enable row level security;

create policy "ovbridge_pairing_tokens: select own"
  on ovbridge.ovbridge_pairing_tokens for select
  using (auth.uid() = user_id);

create policy "ovbridge_pairing_tokens: insert own"
  on ovbridge.ovbridge_pairing_tokens for insert
  with check (auth.uid() = user_id);

create policy "ovbridge_pairing_tokens: update own"
  on ovbridge.ovbridge_pairing_tokens for update
  using (auth.uid() = user_id);

-- ---------- 4. TRANSFERS ----------
create table ovbridge.ovbridge_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_device_id uuid not null references ovbridge.ovbridge_devices(id) on delete cascade,
  to_device_id uuid references ovbridge.ovbridge_devices(id) on delete cascade,
  kind text not null check (kind in ('text', 'file')),
  content text,                 -- si kind = 'text' (chiffré, base64)
  file_path text,               -- si kind = 'file' (chemin Supabase Storage)
  file_name text,
  file_size bigint,
  mime_type text,
  encrypted_key text,           -- clé symétrique chiffrée pour le destinataire
  nonce text,                   -- nonce libsodium
  status text default 'pending' check (status in ('pending','delivered','read','expired')),
  expires_at timestamptz,
  created_at timestamptz default now() not null
);

create index ovbridge_transfers_user_idx
  on ovbridge.ovbridge_transfers(user_id);
create index ovbridge_transfers_to_device_idx
  on ovbridge.ovbridge_transfers(to_device_id);
create index ovbridge_transfers_from_device_idx
  on ovbridge.ovbridge_transfers(from_device_id);

alter table ovbridge.ovbridge_transfers enable row level security;

create policy "ovbridge_transfers: select own"
  on ovbridge.ovbridge_transfers for select
  using (auth.uid() = user_id);

create policy "ovbridge_transfers: insert own"
  on ovbridge.ovbridge_transfers for insert
  with check (auth.uid() = user_id);

create policy "ovbridge_transfers: update own"
  on ovbridge.ovbridge_transfers for update
  using (auth.uid() = user_id);

create policy "ovbridge_transfers: delete own"
  on ovbridge.ovbridge_transfers for delete
  using (auth.uid() = user_id);

-- ---------- 5. STORAGE BUCKET ----------
insert into storage.buckets (id, name, public)
values ('ovbridge_files', 'ovbridge_files', false)
on conflict do nothing;

create policy "ovbridge_files: users upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'ovbridge_files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "ovbridge_files: users read own folder"
  on storage.objects for select
  using (
    bucket_id = 'ovbridge_files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "ovbridge_files: users delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'ovbridge_files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------- 6. REALTIME ----------
alter publication supabase_realtime add table ovbridge.ovbridge_devices;
alter publication supabase_realtime add table ovbridge.ovbridge_transfers;