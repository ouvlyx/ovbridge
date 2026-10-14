revoke execute on function ovbridge.ovbridge_is_member(uuid, uuid) from public;
grant execute on function ovbridge.ovbridge_is_member(uuid, uuid) to authenticated;

revoke execute on function ovbridge.ovbridge_is_admin(uuid, uuid) from public;
grant execute on function ovbridge.ovbridge_is_admin(uuid, uuid) to authenticated;

revoke execute on function ovbridge.ovbridge_shares_space(uuid, uuid) from public;
grant execute on function ovbridge.ovbridge_shares_space(uuid, uuid) to authenticated;