export function buildIssueUrl(title: string, body: string) {
  const base = "https://github.com/ouvlyx/ovbridge/issues/new";
  const q = new URLSearchParams({ title, body }).toString();
  return `${base}?${q}`;
}
