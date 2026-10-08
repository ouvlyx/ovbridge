# 🔗 `src/features/pairing/` — Device Pairing

This module facilitates cross-device pairing via single-use 6-digit tokens or QR code scanning.

---

## 📋 File Index

| File | Route | Responsibility |
| :--- | :--- | :--- |
| `PairingPage.tsx` | `/pair` | Displays a generated 6-digit pairing code and QR code for scanning by secondary devices |
| `JoinPage.tsx` | `/join` | Allows a secondary device to enter a 6-digit pairing code to complete device linkage |
| `ScanPage.tsx` | `/scan` | Camera view for scanning a primary device's pairing QR code |
| `usePairing.ts` | — | Hook generating and consuming pairing tokens via atomic Postgres RPC functions |

---

## 🧭 Navigation Links
* [⬅️ Back to Features Index (`src/features/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
