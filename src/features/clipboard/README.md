# 📋 `src/features/clipboard/` — Shared Cross-Device Clipboard

This module manages real-time, end-to-end encrypted shared clipboard syncing between user devices.

---

## 📋 File Index

| File | Responsibility |
| :--- | :--- |
| `ClipboardPage.tsx` | Main clipboard entry list view with sensitive data masking, manual text creation, and copy-to-clipboard actions |
| `ShareClipboardDialog.tsx` | Modal dialog for entering new text manually or pasting system clipboard content |
| `useClipboard.ts` | Custom hook subscribing to Supabase Realtime changes on `ovbridge_clipboard` with concurrency locks |

---

## 🧭 Navigation Links
* [⬅️ Back to Features Index (`src/features/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
