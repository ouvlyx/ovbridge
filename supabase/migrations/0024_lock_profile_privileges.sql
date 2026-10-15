alter table ovbridge.ovbridge_profiles
  add column if not exists updated_at timestamptz not null default now();

revoke update on ovbridge.ovbridge_profiles from anon, authenticated;
grant update (
  display_name,
  first_name,
  last_name,
  phone_number,
  address,
  avatar_url,
  theme_color,
  accent_color,
  interface_density,
  language
) on ovbridge.ovbridge_profiles to authenticated;

create or replace function ovbridge.ovbridge_get_admin_role(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(admin_role, 'none')
  from ovbridge.ovbridge_profiles
  where id = p_user_id
    and p_user_id = auth.uid();
$$;

revoke all on function ovbridge.ovbridge_get_admin_role(uuid) from public, anon;
grant execute on function ovbridge.ovbridge_get_admin_role(uuid) to authenticated;

create or replace function ovbridge.ovbridge_is_member(p_space uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select p_user = auth.uid()
    and exists (
      select 1
      from ovbridge.ovbridge_space_members
      where space_id = p_space and user_id = p_user
    );
$$;

revoke all on function ovbridge.ovbridge_is_member(uuid, uuid) from public, anon;
grant execute on function ovbridge.ovbridge_is_member(uuid, uuid) to authenticated;

create or replace function ovbridge.ovbridge_is_admin(p_space uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select p_user = auth.uid()
    and exists (
      select 1
      from ovbridge.ovbridge_space_members
      where space_id = p_space and user_id = p_user and role = 'admin'
    );
$$;

revoke all on function ovbridge.ovbridge_is_admin(uuid, uuid) from public, anon;
grant execute on function ovbridge.ovbridge_is_admin(uuid, uuid) to authenticated;

create or replace function ovbridge.ovbridge_shares_space(p_u1 uuid, p_u2 uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() in (p_u1, p_u2)
    and exists (
      select 1
      from ovbridge.ovbridge_space_members m1
      join ovbridge.ovbridge_space_members m2 using (space_id)
      where m1.user_id = p_u1 and m2.user_id = p_u2
    );
$$;

revoke all on function ovbridge.ovbridge_shares_space(uuid, uuid) from public, anon;
grant execute on function ovbridge.ovbridge_shares_space(uuid, uuid) to authenticated;

drop policy if exists "profiles: select own or co-members"
  on ovbridge.ovbridge_profiles;

create or replace function ovbridge.ovbridge_list_space_member_profiles(p_space_id uuid)
returns table (id uuid, email text, display_name text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.email, p.display_name
  from ovbridge.ovbridge_space_members m
  join ovbridge.ovbridge_profiles p on p.id = m.user_id
  where m.space_id = p_space_id
    and ovbridge.ovbridge_is_member(p_space_id, auth.uid());
$$;

revoke all on function ovbridge.ovbridge_list_space_member_profiles(uuid)
  from public, anon;
grant execute on function ovbridge.ovbridge_list_space_member_profiles(uuid)
  to authenticated;

drop policy if exists "call_rooms: insert own" on ovbridge.ovbridge_call_rooms;
drop policy if exists "call_rooms: insert own member" on ovbridge.ovbridge_call_rooms;
create policy "call_rooms: insert own member"
  on ovbridge.ovbridge_call_rooms for insert
  with check (
    auth.uid() = host_id
    and (
      space_id is null
      or ovbridge.ovbridge_is_member(space_id, auth.uid())
    )
  );

drop policy if exists "call_rooms: select members" on ovbridge.ovbridge_call_rooms;
drop policy if exists "call_rooms: select current members" on ovbridge.ovbridge_call_rooms;
create policy "call_rooms: select current members"
  on ovbridge.ovbridge_call_rooms for select
  using (
    (space_id is null and auth.uid() = host_id)
    or (space_id is not null
        and ovbridge.ovbridge_is_member(space_id, auth.uid()))
  );

drop policy if exists "call_rooms: update host" on ovbridge.ovbridge_call_rooms;
drop policy if exists "call_rooms: update host member" on ovbridge.ovbridge_call_rooms;
create policy "call_rooms: update host member"
  on ovbridge.ovbridge_call_rooms for update
  using (auth.uid() = host_id)
  with check (
    auth.uid() = host_id
    and (
      space_id is null
      or ovbridge.ovbridge_is_member(space_id, auth.uid())
    )
  );

drop policy if exists "call_participants: insert self"
  on ovbridge.ovbridge_call_participants;
drop policy if exists "call_participants: insert self active device"
  on ovbridge.ovbridge_call_participants;
create policy "call_participants: insert self active device"
  on ovbridge.ovbridge_call_participants for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from ovbridge.ovbridge_devices d
      where d.id = device_id
        and d.user_id = auth.uid()
        and not d.revoked
    )
    and exists (
      select 1
      from ovbridge.ovbridge_call_rooms r
      where r.id = room_id
        and (
          (r.space_id is null and r.host_id = auth.uid())
          or (r.space_id is not null
              and ovbridge.ovbridge_is_member(r.space_id, auth.uid()))
        )
    )
  );

drop policy if exists "call_participants: select same room"
  on ovbridge.ovbridge_call_participants;
drop policy if exists "call_participants: select current room members"
  on ovbridge.ovbridge_call_participants;
create policy "call_participants: select current room members"
  on ovbridge.ovbridge_call_participants for select
  using (
    exists (
      select 1
      from ovbridge.ovbridge_call_rooms r
      where r.id = room_id
        and (
          (r.space_id is null and r.host_id = auth.uid())
          or (r.space_id is not null
              and ovbridge.ovbridge_is_member(r.space_id, auth.uid()))
        )
    )
  );

drop policy if exists "call_participants: update self"
  on ovbridge.ovbridge_call_participants;
drop policy if exists "call_participants: update self active device"
  on ovbridge.ovbridge_call_participants;
create policy "call_participants: update self active device"
  on ovbridge.ovbridge_call_participants for update
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from ovbridge.ovbridge_devices d
      where d.id = device_id
        and d.user_id = auth.uid()
        and not d.revoked
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from ovbridge.ovbridge_devices d
      where d.id = device_id
        and d.user_id = auth.uid()
        and not d.revoked
    )
    and exists (
      select 1
      from ovbridge.ovbridge_call_rooms r
      where r.id = room_id
        and (
          (r.space_id is null and r.host_id = auth.uid())
          or (r.space_id is not null
              and ovbridge.ovbridge_is_member(r.space_id, auth.uid()))
        )
    )
  );

drop policy if exists "ovbridge_admin_logs: sss admins access"
  on ovbridge.ovbridge_admin_logs;

drop policy if exists "ovbridge_admin_logs: select sss admins"
  on ovbridge.ovbridge_admin_logs;
create policy "ovbridge_admin_logs: select sss admins"
  on ovbridge.ovbridge_admin_logs for select
  using (ovbridge.ovbridge_get_admin_role(auth.uid()) = 'sss_admin');

drop policy if exists "ovbridge_admin_logs: insert own sss admin action"
  on ovbridge.ovbridge_admin_logs;
create policy "ovbridge_admin_logs: insert own sss admin action"
  on ovbridge.ovbridge_admin_logs for insert
  with check (
    admin_id = auth.uid()
    and admin_role = ovbridge.ovbridge_get_admin_role(auth.uid())
    and admin_role = 'sss_admin'
  );

revoke all on function ovbridge.ovbridge_admin_set_user_ban(uuid, boolean, text)
  from public, anon;
grant execute on function ovbridge.ovbridge_admin_set_user_ban(uuid, boolean, text)
  to authenticated;

revoke all on function ovbridge.ovbridge_admin_set_user_role(uuid, text)
  from public, anon;
grant execute on function ovbridge.ovbridge_admin_set_user_role(uuid, text)
  to authenticated;
