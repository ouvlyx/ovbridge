# 🛣️ `src/routes/` — Routing & Route Guards

This module configures application routing via React Router and enforces route-level authentication and authorization guards.

---

## 📋 File Index

| File | Responsibility |
| :--- | :--- |
| `AppRouter.tsx` | Central React Router switcher registering public, protected, and admin routes |
| `ProtectedRoute.tsx` | Route wrapper redirecting unauthenticated users to `/login` |
| `AdminRoute.tsx` | Route wrapper checking caller admin role level against `minLevel` (Level 10+) before granting access to `/admin` |

---

## 🧭 Navigation Links
* [⬅️ Back to Source Root (`src/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
