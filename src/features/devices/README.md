# 📱 `src/features/devices/` — Device Management

This module manages registered user devices, device identity registration, device renaming, and access revocation.

---

## 📋 File Index

| File | Responsibility |
| :--- | :--- |
| `DevicesPage.tsx` | Main dashboard displaying active user devices, last seen timestamps, and pairing launcher |
| `useDevices.ts` | Hook fetching and managing the list of active user devices |
| `useDeviceAlerts.ts` | Realtime listener alerting users when new devices are linked to their account |
| `RenameDeviceDialog.tsx` | Modal dialog for updating a device's display name |
| `ConfirmDialog.tsx` | Reusable confirmation dialog for device revocation and deletion actions |

---

## 🧭 Navigation Links
* [⬅️ Back to Features Index (`src/features/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
