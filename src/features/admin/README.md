# 🛡️ `src/features/admin/` — 4-Tier Governance Console

This feature module implements the 4-tier administration console for OvBridge (`sss_admin`, `ss_admin`, `s_admin`, `admin`).

---

## 📋 File Index

| File | Responsibility | Role Level |
| :--- | :--- | :--- |
| `AdminDashboardPage.tsx` | Main tabbed admin console container dynamically unlocking sections based on caller level | Level 10+ |
| `AdminSection.tsx` | User list, member invitations via reset email, and user ban/unban controls | Level 10 (Admin) |
| `SAdminSection.tsx` | Moderation reports review, status updates, and dismissals | Level 40 (S Admin) |
| `SsAdminSection.tsx` | System error logs monitoring and active system rule settings | Level 70 (SS Admin) |
| `SssAdminSection.tsx` | Immutable admin audit log viewer (`ovbridge_admin_logs`) and system statistics | Level 100 (SSS Admin) |

---

## 🧭 Navigation Links
* [⬅️ Back to Features Index (`src/features/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
