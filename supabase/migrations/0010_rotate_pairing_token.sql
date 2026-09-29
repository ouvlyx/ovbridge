create or replace function public.ovbridge_create_pairing_token(
  p_device_id uuid,
  p_token text,
  p_expires_at timestamptz
)
returns public.ovbridge_pairing_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.ovbridge_pairing_tokens;
begin
  if not exists (
    select 1 from public.ovbridge_devices
    where id = p_device_id
      and user_id = auth.uid()
      and not revoked
  ) then
    raise exception 'Active device not found';
  end if;

  update public.ovbridge_pairing_tokens
  set used_at = now()
  where created_by_device = p_device_id
    and used_at is null;

  insert into public.ovbridge_pairing_tokens (
    user_id,
    created_by_device,
    token,
    expires_at
  )
  values (auth.uid(), p_device_id, p_token, p_expires_at)
  returning * into v_token;

  return v_token;
end;
$$;

grant execute on function public.ovbridge_create_pairing_token(uuid, text, timestamptz)
  to authenticated;