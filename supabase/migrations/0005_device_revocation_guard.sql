create or replace function public.ovbridge_prevent_device_unrevoke()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.revoked and not new.revoked then
    raise exception 'A revoked device cannot be reactivated';
  end if;
  return new;
end;
$$;

create trigger ovbridge_prevent_device_unrevoke
  before update of revoked on public.ovbridge_devices
  for each row execute function public.ovbridge_prevent_device_unrevoke();

drop policy if exists "ovbridge_transfers: insert own"
  on public.ovbridge_transfers;

create policy "ovbridge_transfers: insert own active device"
  on public.ovbridge_transfers for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ovbridge_devices d
      where d.id = from_device_id
        and d.user_id = auth.uid()
        and not d.revoked
    )
  );

drop policy if exists "ovbridge_pairing_tokens: insert own"
  on public.ovbridge_pairing_tokens;

create policy "ovbridge_pairing_tokens: insert own active device"
  on public.ovbridge_pairing_tokens for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ovbridge_devices d
      where d.id = created_by_device
        and d.user_id = auth.uid()
        and not d.revoked
    )
  );