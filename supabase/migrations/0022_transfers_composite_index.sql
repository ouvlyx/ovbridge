-- =====================================================
-- OvBridge — Migration 0022: Index composite pour les transferts
-- =====================================================

-- Index composite optimisant les requêtes d'historique de conversation et de statut
create index if not exists ovbridge_transfers_user_status_created_idx
  on public.ovbridge_transfers(user_id, status, created_at desc);
