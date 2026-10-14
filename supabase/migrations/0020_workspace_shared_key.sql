-- =====================================================
-- OvBridge — Migration 0020: clé d'espace partagée entre appareils
-- =====================================================
-- Problème corrigé : les fichiers du workspace étaient chiffrés avec la paire de
-- clés de l'appareil qui les envoyait (chiffrement « vers soi-même »). Les autres
-- appareils du même compte ne pouvaient donc jamais les déchiffrer.
--
-- Nouveau modèle : une clé d'espace unique par workspace, générée côté client et
-- chiffrée séparément pour chaque appareil. Le serveur ne voit jamais la clé en clair.

-- 1. Schéma de chiffrement de chaque fichier ('device' = ancien format, 'workspace-v1' = nouveau)
alter table ovbridge.ovbridge_workspace_files
  add column if not exists key_scheme text not null default 'device'
  check (key_scheme in ('device', 'workspace-v1'));

-- 2. Une ligne par (workspace, appareil) : la clé d'espace chiffrée pour cet appareil
create table if not exists ovbridge.ovbridge_workspace_keys (
  workspace_id uuid not null references ovbridge.ovbridge_workspaces(id) on delete cascade,
  device_id uuid not null references ovbridge.ovbridge_devices(id) on delete cascade,
  wrapped_key text not null,
  nonce text not null,
  -- clé publique de l'appareil qui a chiffré (stockée en clair : survit à sa suppression)
  wrapped_by_public_key text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, device_id)
);

create index if not exists ovbridge_workspace_keys_device_idx
  on ovbridge.ovbridge_workspace_keys(device_id);

alter table ovbridge.ovbridge_workspace_keys enable row level security;

create policy "ovbridge_workspace_keys: select own"
  on ovbridge.ovbridge_workspace_keys for select
  using (
    exists (
      select 1 from ovbridge.ovbridge_workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

-- On ne peut ajouter une clé que pour un appareil de SON compte, dans SON workspace
create policy "ovbridge_workspace_keys: insert own"
  on ovbridge.ovbridge_workspace_keys for insert
  with check (
    exists (
      select 1 from ovbridge.ovbridge_workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
    and exists (
      select 1 from ovbridge.ovbridge_devices d
      where d.id = device_id and d.user_id = auth.uid()
    )
  );

create policy "ovbridge_workspace_keys: delete own"
  on ovbridge.ovbridge_workspace_keys for delete
  using (
    exists (
      select 1 from ovbridge.ovbridge_workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

-- Pas de policy UPDATE : une clé chiffrée est immuable (on la supprime et on la recrée).
