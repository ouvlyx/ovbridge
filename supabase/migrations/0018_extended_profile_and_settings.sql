-- =====================================================
-- OvBridge — Migration 0018: Extended Profile & Theme Settings
-- =====================================================

alter table ovbridge.ovbridge_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone_number text,
  add column if not exists address text,
  add column if not exists avatar_url text,
  add column if not exists auth_provider text default 'email',
  add column if not exists theme_color text default 'indigo',
  add column if not exists accent_color text default '#6366F1',
  add column if not exists interface_density text default 'normal' check (interface_density in ('compact', 'normal', 'comfortable')),
  add column if not exists language text default 'fr';
