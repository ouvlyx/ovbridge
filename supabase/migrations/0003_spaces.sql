-- =====================================================
-- OvBridge — Espaces partagés (collaborateurs / projets)
-- =====================================================

-- ---------- 1. HELPER : membre d'un espace ? ----------
create or replace function ovbridge.ovbridge_is_member(p_space uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from ovbridge_space_members
    where space_id = p_space and user_id = p_user
  );
$$;

-- ---------- 2. HELPER : admin d'un espace ? ----------
create or replace function ovbridge.ovbridge_is_admin(p_space uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from ovbridge_space_members
    where space_id = p_space and user_id = p_user and role = 'admin'
  );
$$;

-- ---------- 3. HELPER : deux users partagent un espace ? ----------
create or replace function ovbridge.ovbridge_shares_space(p_u1 uuid, p_u2 uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from ovbridge_space_members m1
    join ovbridge_space_members m2 using (space_id)
    where m1.user_id = p_u1 and m2.user_id = p_u2
  );
$$;

-- ---------- 4. ESPACES ----------
create table ovbridge.ovbridge_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now() not null
);

create index ovbridge_spaces_owner_idx on ovbridge.ovbridge_spaces(owner_id);

alter table ovbridge.ovbridge_spaces enable row level security;

create policy "spaces: select member"
  on ovbridge.ovbridge_spaces for select
  using (ovbridge_is_member(id, auth.uid()));

create policy "spaces: insert owner"
  on ovbridge.ovbridge_spaces for insert
  with check (auth.uid() = owner_id);

create policy "spaces: update admin"
  on ovbridge.ovbridge_spaces for update
  using (ovbridge_is_admin(id, auth.uid()));

create policy "spaces: delete owner"
  on ovbridge.ovbridge_spaces for delete
  using (auth.uid() = owner_id);

-- ---------- 5. MEMBRES ----------
create table ovbridge.ovbridge_space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references ovbridge.ovbridge_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz default now() not null,
  unique (space_id, user_id)
);

create index ovbridge_space_members_space_idx on ovbridge.ovbridge_space_members(space_id);
create index ovbridge_space_members_user_idx on ovbridge.ovbridge_space_members(user_id);

alter table ovbridge.ovbridge_space_members enable row level security;

create policy "members: select same space"
  on ovbridge.ovbridge_space_members for select
  using (ovbridge_is_member(space_id, auth.uid()));

create policy "members: insert admin"
  on ovbridge.ovbridge_space_members for insert
  with check (ovbridge_is_admin(space_id, auth.uid()));

create policy "members: update admin"
  on ovbridge.ovbridge_space_members for update
  using (ovbridge_is_admin(space_id, auth.uid()));

create policy "members: delete admin or self"
  on ovbridge.ovbridge_space_members for delete
  using (
    user_id = auth.uid()
    or ovbridge_is_admin(space_id, auth.uid())
  );

-- ---------- 6. INVITATIONS ----------
create table ovbridge.ovbridge_space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references ovbridge.ovbridge_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

create index ovbridge_space_invites_code_idx on ovbridge.ovbridge_space_invites(code);

alter table ovbridge.ovbridge_space_invites enable row level security;

create policy "space_invites: select member"
  on ovbridge.ovbridge_space_invites for select
  using (ovbridge_is_member(space_id, auth.uid()));

create policy "space_invites: insert member"
  on ovbridge.ovbridge_space_invites for insert
  with check (ovbridge_is_member(space_id, auth.uid()));

create policy "space_invites: delete admin"
  on ovbridge.ovbridge_space_invites for delete
  using (ovbridge_is_admin(space_id, auth.uid()));

-- ---------- 7. RPC : rejoindre un espace par code ----------
create or replace function ovbridge.ovbridge_join_space_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_space_id uuid;
begin
  select * into v_invite
  from ovbridge_space_invites
  where code = p_code
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Code invalide ou expiré';
  end if;

  v_space_id := v_invite.space_id;

  insert into ovbridge_space_members (space_id, user_id, role)
  values (v_space_id, auth.uid(), 'member')
  on conflict (space_id, user_id) do nothing;

  update ovbridge_space_invites
  set used_at = now(), used_by = auth.uid()
  where id = v_invite.id;

  return v_space_id;
end;
$$;

grant execute on function ovbridge.ovbridge_join_space_by_code(text) to authenticated;

-- ---------- 8. TRIGGER : owner devient admin ----------
create or replace function ovbridge.ovbridge_add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into ovbridge_space_members (space_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict do nothing;
  return new;
end;
$$;

create trigger ovbridge_space_owner_member
  after insert on ovbridge.ovbridge_spaces
  for each row execute function ovbridge.ovbridge_add_owner_as_member();

-- ---------- 9. TRANSFERTS : ajouter to_space_id ----------
alter table ovbridge.ovbridge_transfers
  add column if not exists to_space_id uuid
  references ovbridge.ovbridge_spaces(id) on delete set null;

create index if not exists ovbridge_transfers_to_space_idx
  on ovbridge.ovbridge_transfers(to_space_id);

-- Remplacer la policy select pour inclure les espaces
drop policy if exists "ovbridge_transfers: select own" on ovbridge.ovbridge_transfers;

create policy "ovbridge_transfers: select own or in space"
  on ovbridge.ovbridge_transfers for select
  using (
    auth.uid() = user_id
    or (to_space_id is not null and ovbridge_is_member(to_space_id, auth.uid()))
  );

-- ---------- 10. DEVICES : visibles entre co-membres ----------
drop policy if exists "ovbridge_devices: select own" on ovbridge.ovbridge_devices;

create policy "ovbridge_devices: select own or co-members"
  on ovbridge.ovbridge_devices for select
  using (
    auth.uid() = user_id
    or ovbridge_shares_space(auth.uid(), user_id)
  );

-- ---------- 11. PROFILES : visibles entre co-membres ----------
drop policy if exists "profiles: select own" on ovbridge.ovbridge_profiles;

create policy "profiles: select own or co-members"
  on ovbridge.ovbridge_profiles for select
  using (
    auth.uid() = id
    or ovbridge_shares_space(auth.uid(), id)
  );

-- ---------- 12. REALTIME ----------
alter publication supabase_realtime add table ovbridge.ovbridge_spaces;
alter publication supabase_realtime add table ovbridge.ovbridge_space_members;
alter publication supabase_realtime add table ovbridge.ovbridge_space_invites;