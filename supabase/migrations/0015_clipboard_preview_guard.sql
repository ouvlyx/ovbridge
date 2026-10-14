alter table ovbridge.ovbridge_clipboard
  add constraint ovbridge_clipboard_preview_must_be_null
  check (preview is null);

alter table ovbridge.ovbridge_clipboard
  add constraint ovbridge_clipboard_ciphertext_size_limit
  check (octet_length(content_encrypted) <= 700000)
  not valid;