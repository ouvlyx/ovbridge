create or replace function ovbridge.ovbridge_consume_pairing_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update ovbridge.ovbridge_pairing_tokens
  set used_at = now()
  where token = p_token
    and user_id = auth.uid()
    and used_at is null
    and expires_at > now();

  return found;
end;
$$;

grant execute on function ovbridge.ovbridge_consume_pairing_token(text)
  to authenticated;

revoke update on ovbridge.ovbridge_pairing_tokens from authenticated;