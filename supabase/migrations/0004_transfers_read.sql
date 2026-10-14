-- Marquer quand un transfert a été lu
alter table ovbridge.ovbridge_transfers
  add column if not exists read_at timestamptz;

-- Index pour requêtes rapides par espace
create index if not exists ovbridge_transfers_space_created_idx
  on ovbridge.ovbridge_transfers(to_space_id, created_at desc);