drop policy if exists "ovbridge_files: users read own folder"
  on storage.objects;

create policy "ovbridge_files: users read own or space files"
  on storage.objects for select
  using (
    bucket_id = 'ovbridge_files'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or case
        when (storage.foldername(name))[2] ~
          '^space-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then public.ovbridge_is_member(
          substring((storage.foldername(name))[2] from 7)::uuid,
          auth.uid()
        )
        else false
      end
    )
  );