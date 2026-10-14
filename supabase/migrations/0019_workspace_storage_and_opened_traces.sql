-- =====================================================
-- OvBridge — Migration 0019: Workspace Storage RLS & Opened Traces
-- =====================================================

-- 1. Autoriser le stockage des fichiers d'espace personnel (Workspace)
drop policy if exists "workspace_files: insert owner" on storage.objects;
drop policy if exists "workspace_files: select owner" on storage.objects;
drop policy if exists "workspace_files: delete owner" on storage.objects;

create policy "workspace_files: insert owner"
  on storage.objects for insert
  with check (
    bucket_id = 'ovbridge_files'
    and split_part(name, '/', 1) = 'workspace'
    and split_part(name, '/', 2) = auth.uid()::text
  );

create policy "workspace_files: select owner"
  on storage.objects for select
  using (
    bucket_id = 'ovbridge_files'
    and split_part(name, '/', 1) = 'workspace'
    and split_part(name, '/', 2) = auth.uid()::text
  );

create policy "workspace_files: delete owner"
  on storage.objects for delete
  using (
    bucket_id = 'ovbridge_files'
    and split_part(name, '/', 1) = 'workspace'
    and split_part(name, '/', 2) = auth.uid()::text
  );

-- 2. Colonne et politique de traçabilité pour la lecture/ouverture des fichiers & messages
alter table ovbridge.ovbridge_transfers
  add column if not exists opened_at timestamptz;

-- Index pour filtres rapides par statut de lecture
create index if not exists ovbridge_transfers_read_opened_idx
  on ovbridge.ovbridge_transfers(to_device_id, read_at, opened_at);
