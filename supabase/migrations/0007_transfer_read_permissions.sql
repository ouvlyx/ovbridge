revoke update on public.ovbridge_transfers from authenticated;
grant update (status, read_at)
  on public.ovbridge_transfers to authenticated;

drop policy if exists "ovbridge_transfers: update own"
  on public.ovbridge_transfers;

create policy "ovbridge_transfers: update read state"
  on public.ovbridge_transfers for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.ovbridge_devices d
      where d.id = to_device_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.ovbridge_devices d
      where d.id = to_device_id
        and d.user_id = auth.uid()
    )
  );

create or replace function public.ovbridge_validate_transfer_read_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is distinct from old.user_id
     and (new.status is distinct from 'read' or new.read_at is null) then
    raise exception 'Recipients can only mark transfers as read';
  end if;
  return new;
end;
$$;

create trigger ovbridge_validate_transfer_read_update
  before update of status, read_at on public.ovbridge_transfers
  for each row execute function public.ovbridge_validate_transfer_read_update();