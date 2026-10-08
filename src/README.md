# 📂 `src/` — Source Code Architecture & Directory Index

Welcome to the `src/` directory index. This folder contains the core frontend application code for **OvBridge**.

---

## 📋 Directory Index

| Sub-Folder / File | Responsibility | Documentation Link |
| :--- | :--- | :--- |
| `components/` | Reusable UI components, layouts (`AppLayout`), sidebars, bottom bars, and 404/Error Boundaries | [Read `components/README.md`](./components/README.md) |
| `features/` | Feature-based domain modules (Auth, Devices, Transfers, Spaces, Clipboard, Workspace, Admin, Profile, Pairing, Legal) | [Read `features/README.md`](./features/README.md) |
| `lib/` | Core services, Libsodium E2E crypto, Supabase client, offline queue, notifications, and error handlers | [Read `lib/README.md`](./lib/README.md) |
| `routes/` | React Router route definitions, protected route guards, and admin route authorization | [Read `routes/README.md`](./routes/README.md) |
| `types/` | TypeScript interfaces for Supabase database schema and admin governance models | [Read `types/README.md`](./types/README.md) |
| `App.tsx` | Top-level React root wrapping ErrorBoundary, AuthProvider, and NetworkStatusBanner | — |
| `main.tsx` | Application entry point mounting React root and registering PWA service worker | — |
| `index.css` | Global Tailwind CSS v4 directives and custom OvBridge theme variables | — |

---

## 🧭 Navigation Links
* [⬅️ Back to Master PROJECT.md](../../PROJECT.md)
* [🧩 Components Documentation](./components/README.md)
* [🚀 Features Documentation](./features/README.md)
* [🛠️ Foundational Libraries](./lib/README.md)
* [🛣️ App Router Documentation](./routes/README.md)
* [📐 TypeScript Definitions](./types/README.md)
