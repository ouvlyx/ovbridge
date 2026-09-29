create policy "ovbridge_transfers: select recipient device"
  on public.ovbridge_transfers for select
  using (
    exists (
      select 1 from public.ovbridge_devices d
      where d.id = to_device_id
        and d.user_id = auth.uid()
    )
  );