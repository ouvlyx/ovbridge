alter table public.ovbridge_devices
  add column if not exists seen_at timestamptz;

-- Les devices existants sont marqués comme vus
update public.ovbridge_devices set seen_at = now() where seen_at is null;