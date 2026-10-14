# 🧩 `src/components/` — UI Components & Layouts

This directory contains reusable UI components, navigation layouts, error handling wrappers, and base Shadcn primitives.

---

## 📋 File Index

| File | Responsibility |
| :--- | :--- |
| `AppLayout.tsx` | Main responsive shell rendering `DesktopSidebar` on large viewports and `BottomNavBar` on mobile |
| `DesktopSidebar.tsx` | Persistent desktop/tablet left navigation sidebar with user session info and route links |
| `BottomNavBar.tsx` | Fixed mobile bottom navigation bar with active route highlighting |
| `NetworkStatusBanner.tsx` | Top banner notifying users when offline and automatically flushing the offline transfer queue |
| `ErrorBoundary.tsx` | Top-level React error boundary; unexpected render errors show recovery actions, while failed dynamic imports show a retry state |
| `NotFoundPage.tsx` | Branded 404 error page with quick links to home, devices, pairing, and login |
| `ui/` | Primitive UI components (button, card, dialog, badge, input, label, dropdown-menu) |

---

## 🧭 Navigation Links
* [⬅️ Back to Source Root (`src/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
