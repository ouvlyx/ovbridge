create table if not exists public.ovbridge_call_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid references public.ovbridge_spaces(id) on delete cascade,
  type text not null check (type in ('audio', 'video')),
  title text,
  max_participants int not null default 4,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz default now() not null,
  ended_at timestamptz
);

create index if not exists ovbridge_call_rooms_space_idx
  on public.ovbridge_call_rooms(space_id, status);

create table if not exists public.ovbridge_call_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.ovbridge_call_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.ovbridge_devices(id) on delete cascade,
  joined_at timestamptz default now() not null,
  left_at timestamptz,
  is_muted boolean default false,
  is_video_off boolean default false,
  unique (room_id, device_id)
);

create index if not exists ovbridge_call_participants_room_idx
  on public.ovbridge_call_participants(room_id, left_at);

alter table public.ovbridge_call_rooms enable row level security;
alter table public.ovbridge_call_participants enable row level security;

drop policy if exists "call_rooms: select members" on public.ovbridge_call_rooms;
create policy "call_rooms: select members"
  on public.ovbridge_call_rooms for select
  using (
    auth.uid() = host_id
    or (space_id is not null and ovbridge_is_member(space_id, auth.uid()))
  );

drop policy if exists "call_rooms: insert own" on public.ovbridge_call_rooms;
create policy "call_rooms: insert own"
  on public.ovbridge_call_rooms for insert
  with check (auth.uid() = host_id);

drop policy if exists "call_rooms: update host" on public.ovbridge_call_rooms;
create policy "call_rooms: update host"
  on public.ovbridge_call_rooms for update
  using (auth.uid() = host_id);

drop policy if exists "call_participants: select same room" on public.ovbridge_call_participants;
create policy "call_participants: select same room"
  on public.ovbridge_call_participants for select
  using (
    exists (
      select 1 from public.ovbridge_call_rooms r
      where r.id = room_id
        and (
          r.host_id = auth.uid()
          or (r.space_id is not null and ovbridge_is_member(r.space_id, auth.uid()))
        )
    )
  );

drop policy if exists "call_participants: insert self" on public.ovbridge_call_participants;
create policy "call_participants: insert self"
  on public.ovbridge_call_participants for insert
  with check (auth.uid() = user_id);

drop policy if exists "call_participants: update self" on public.ovbridge_call_participants;
create policy "call_participants: update self"
  on public.ovbridge_call_participants for update
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'ovbridge_call_rooms'
  ) then
    alter publication supabase_realtime add table public.ovbridge_call_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'ovbridge_call_participants'
  ) then
    alter publication supabase_realtime add table public.ovbridge_call_participants;
  end if;
end $$;