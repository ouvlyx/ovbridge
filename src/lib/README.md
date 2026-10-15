# 🛠️ `src/lib/` — Foundational Services & Utilities

This folder contains foundational services, Libsodium encryption wrappers, Supabase client configuration, offline queueing, and notification helpers.

---

## 📋 File Index

| File | Responsibility |
| :--- | :--- |
| `crypto.ts` | Libsodium wrappers for local keypair generation, public key fingerprinting, public-key encryption, and symmetric text/file encryption |
| `supabase.ts` | Configured Supabase JS client instance using environment variables |
| `device.ts` | Local device registration, keypair persistence in `localStorage`, fingerprinting, and identity management |
| `transfers.ts` | Encrypted text/file sending, fanout transfer to spaces, conversation fetching, and in-memory sent item caching |
| `clipboard.ts` | Multi-device end-to-end encrypted clipboard sync with per-device wrapped content keys and sensitivity detection |
| `workspace.ts` | Personal storage workspace creation, E2E encrypted file uploads, downloads, and storage usage tracking |
| `projectWorkspace.ts` | Separate encrypted project file storage, project key sharing to approved member devices, and member-only file operations |
| `workspaceKey.ts` | Personal workspace keys wrapped for the account's devices |
| `spaces.ts` | Collaborative space management and recipient device resolution for space fanout transfers |
| `admin.ts` | Service functions wrapping Supabase RPCs for user bans, admin role changes, error logs, and audit logs |
| `errors.ts` | 3-tier error severity classification system (`neutre`, `moyen`, `alerte`) and `friendlyError` French translator |
| `notifications.ts` | Universal alerting combining Web Audio API sound synthesis, mobile vibration, browser Web Push, and Sonner toasts |
| `offlineQueue.ts` | `localStorage` buffer for queuing offline transfers and auto-flushing upon network reconnection |
| `webrtc.ts` | Helper for establishing peer-to-peer WebRTC data channels between devices |
| `qr.ts` | QR code generation helper for pairing |
| `utils.ts` | Tailwind CSS class merging (`cn`) helper |
| `constants.ts` | Global constants (e.g. `MAX_FILE_SIZE_MB`) |
| `localCache.ts` | IndexedDB / local blob storage cache for downloaded files |

---

## 🧭 Navigation Links
* [⬅️ Back to Source Root (`src/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
