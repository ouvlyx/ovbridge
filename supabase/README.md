# 🐘 `supabase/` — Database Schema & Migrations

This directory contains PostgreSQL schema definitions, functions, and Row Level Security (RLS) migrations for Supabase.

---

## 📋 SQL Migrations Index

| Migration File | Description |
| :--- | :--- |
| `0001_init.sql` | Base schema: devices, transfers, pairing tokens, private `ovbridge_files` storage bucket |
| `0002_pair_atomic_and_cleanup.sql` | Atomic pairing token consumption via `ovbridge_consume_pairing_token` RPC |
| `0003_spaces.sql` | Collaborative spaces (`ovbridge_spaces`, `ovbridge_space_members`, `ovbridge_space_invites`) |
| `0004_transfers_read.sql` | Transfer read receipts (`read_at`) column and space index |
| `0005_device_revoke_and_cascade.sql` | Device revocation controls and cascading deletions |
| `0006_space_storage_read.sql` | Storage RLS policy for reading space files |
| `0007_transfer_read_permissions.sql` | Restricted transfer update permissions for recipient read status |
| `0008_cleanup_and_index_perf.sql` | Database performance indexes for queries |
| `0009_profiles.sql` | User profiles table (`ovbridge_profiles`) |
| `0010_device_last_seen_rpc.sql` | Atomic `ovbridge_touch_device_last_seen` heartbeat function |
| `0011_realtime_transfers.sql` | Realtime publication for `ovbridge_transfers` |
| `0012_space_invites_fix.sql` | Atomic space invite consumption via `ovbridge_consume_space_invite` RPC |
| `0013_workspace_and_clipboard.sql` | Shared clipboard (`ovbridge_clipboard`) and workspace storage (`ovbridge_workspaces`) |
| `0014_clipboard_preview_privacy.sql` | Server-side preview privacy purge for sensitive clipboards |
| `0015_clipboard_preview_guard.sql` | Guard restricting clipboard preview visibility |
| `0016_workspace_storage_policies.sql` | Storage RLS policies for personal workspace folders |
| `0017_admin_system.sql` | 4-tier admin governance, error logs, rules, and RPC functions (`ovbridge_admin_set_user_ban`, `ovbridge_admin_set_user_role`) |
| `0018_extended_profile_and_settings.sql` | Extended profile fields (`first_name`, `last_name`, `phone_number`, `address`, `accent_color`, `interface_density`) |
| `0019_workspace_storage_and_opened_traces.sql` | Storage path policy adjustments and message open trace (`opened_at`) column |
| `0023_clipboard_multi_device_keys.sql` | Per-device wrapped keys for shared clipboard encryption |
| `0024_lock_profile_privileges.sql` | Restricts profile privilege updates, helper function scope, and admin audit log mutation |

---

## 🧭 Navigation Links
* [⬅️ Back to Master PROJECT.md](../PROJECT.md)
