alter table ovbridge.ovbridge_clipboard
  add column if not exists encrypted_keys jsonb;
