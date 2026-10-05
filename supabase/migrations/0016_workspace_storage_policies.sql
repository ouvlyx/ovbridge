create policy "workspace_files: insert owner"
  on storage.objects for insert
  with check (
    bucket_id = 'ovbridge_files'
    and split_part(name, '/', 1) = 'workspace'
    and split_part(name, '/', 2) = auth.uid()::text
    and case
      when split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1 from public.ovbridge_workspaces w
        where w.id = split_part(name, '/', 3)::uuid
          and w.owner_id = auth.uid()
      )
      else false
    end
  );

create policy "workspace_files: select owner"
  on storage.objects for select
  using (
    bucket_id = 'ovbridge_files'
    and split_part(name, '/', 1) = 'workspace'
    and split_part(name, '/', 2) = auth.uid()::text
    and case
      when split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1 from public.ovbridge_workspaces w
        where w.id = split_part(name, '/', 3)::uuid
          and w.owner_id = auth.uid()
      )
      else false
    end
  );

create policy "workspace_files: delete owner"
  on storage.objects for delete
  using (
    bucket_id = 'ovbridge_files'
    and split_part(name, '/', 1) = 'workspace'
    and split_part(name, '/', 2) = auth.uid()::text
    and case
      when split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then exists (
        select 1 from public.ovbridge_workspaces w
        where w.id = split_part(name, '/', 3)::uuid
          and w.owner_id = auth.uid()
      )
      else false
    end
  );
