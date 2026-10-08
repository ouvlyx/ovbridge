# 🌉 OvBridge — Master Project Documentation & Architecture Guide

Welcome to the **OvBridge** project documentation. This document serves as the master entry point and architectural guide for developers, maintainers, and security auditors.

---

## 📋 Table of Contents

1. [📌 Project Presentation](#-project-presentation)
2. [🏗️ Global Architecture & Directory Index](#%EF%B8%8F-global-architecture--directory-index)
3. [🔄 Application Flow & Data Lifecycle](#-application-flow--data-lifecycle)
4. [🔐 Security & Zero-Knowledge Architecture](#-security--zero-knowledge-architecture)
5. [⚙️ Environment Variables & Configuration](#%EF%B8%8F-environment-variables--configuration)
6. [🚀 Installation & Commands](#-installation--commands)
7. [🛠️ Development Guidelines](#%EF%B8%8F-development-guidelines)
8. [🧯 Maintenance & Troubleshooting](#-maintenance--troubleshooting)
9. [🗺️ Navigable Documentation Map](#%EF%B8%8F-navigable-documentation-map)

---

## 📌 Project Presentation

### Overview
**OvBridge** is a modern, cross-device Progressive Web Application (PWA) built with **React 19, TypeScript 5.8, Vite 8, Tailwind CSS v4, Supabase**, and **libsodium** (`libsodium-wrappers`).

It bridges smartphones, laptops, and desktop browsers, enabling instant, **zero-knowledge end-to-end encrypted (E2E)** transfers of text messages, files, shared clipboards, and workspace storage.

### Key Features
* 🔒 **Zero-Knowledge E2E Encryption:** All payloads (messages, files, clipboard) are encrypted locally using `libsodium` (`crypto_box_easy` / `crypto_secretbox_easy`) before touching network or cloud storage.
* 📱 **Device Pairing & Management:** Pair new devices via single-use 6-digit codes or QR codes with automatic local device identity registration.
* 💬 **Direct & Space Messaging:** Real-time encrypted text messaging and file sharing between individual devices or collaborative spaces with open/read receipts (`read_at`, `opened_at`).
* 📋 **Shared Clipboard:** Real-time cross-device clipboard synchronization with automated sensitive data detection (regex filtering for passwords, API keys, cards).
* 🗄️ **Personal Workspace Storage:** E2E encrypted cloud drive for personal file storage with quota management.
* 🛡️ **4-Tier Admin Governance:** Governance system supporting SSS Admin (100%), SS Admin (70%), S Admin (40%), and Admin (10%) roles protected by Postgres Row Level Security (RLS) and Security Definer RPCs.
* 📶 **Offline Queue & Re-sync:** Transfers created while offline are queued locally in `localStorage` and automatically synchronized when connectivity recovers.
* 🔔 **Universal Notifications:** Multi-channel alerting blending Web Audio API sound synthesis, mobile vibration, browser Web Push, and Sonner toasts.
* 🎨 **Extended Profile & Theme Customization:** Manage contact details, sync Google profile metadata, choose interface density, and select custom accent colors.
* 📜 **Legal Compliance:** Built-in Privacy Policy (`/privacy`) and Terms of Service (`/terms`).

---

## 🏗️ Global Architecture & Directory Index

The codebase follows a **Feature-Based Modular Architecture** located under `src/features/` alongside reusable foundational UI components (`src/components/`), utility libraries (`src/lib/`), and database migrations (`supabase/`).

```text
ovbridge/
├── PROJECT.md                    # 🌟 Master documentation entry point
├── README.md                     # Quickstart summary & repository overview
├── vercel.json                   # SPA wildcard rewrites for Vercel deployment
├── vite.config.ts                # Vite 8 + PWA configuration
├── package.json                  # Dependencies & npm scripts
├── public/                       # Static brandmark icons, logos, and PWA assets
├── src/                          # Application source code
│   ├── README.md                 # Source documentation index
│   ├── App.tsx                   # Main React root with ErrorBoundary & AuthProvider
│   ├── main.tsx                  # Entry mount script with PWA service worker registration
│   ├── components/               # 🧩 Reusable UI primitives & layouts
│   │   ├── README.md
│   │   ├── AppLayout.tsx
│   │   ├── DesktopSidebar.tsx
│   │   ├── BottomNavBar.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── ui/                   # Shadcn / Tailwind primitive components
│   ├── features/                 # 🚀 Feature modules
│   │   ├── README.md
│   │   ├── admin/                # 🛡️ 4-Tier Admin Console
│   │   ├── auth/                 # 🔑 Auth, OAuth, Reset Password, Callback
│   │   ├── clipboard/            # 📋 Shared Clipboard
│   │   ├── devices/              # 📱 Device Management & Pairing List
│   │   ├── legal/                # 📜 Privacy Policy & Terms Pages
│   │   ├── pairing/              # 🔗 Code & QR Appairage
│   │   ├── profile/              # 👤 Extended Profile & Custom Accent Theme
│   │   ├── spaces/               # 👥 Collaborative Spaces
│   │   ├── transfers/            # 💬 Messages, File Sharing & Chat
│   │   └── workspace/            # 🗄️ Personal Cloud Storage Drive
│   ├── lib/                      # 🛠️ Foundational services & helpers
│   │   ├── README.md
│   │   ├── crypto.ts             # Libsodium E2E encryption wrappers
│   │   ├── supabase.ts           # Supabase JS client instance
│   │   ├── device.ts             # Local device identity & keypair storage
│   │   ├── transfers.ts          # Messaging & transfer services
│   │   ├── clipboard.ts          # Clipboard sync & sensitive regex filter
│   │   ├── workspace.ts          # Personal workspace storage service
│   │   ├── spaces.ts             # Collaborative space member fanout service
│   │   ├── admin.ts              # Admin RPC & audit log service
│   │   ├── errors.ts             # 3-Tier Error Severity System & friendlyError
│   │   ├── notifications.ts     # Universal Audio/Vibe/Push alerting
│   │   ├── offlineQueue.ts       # LocalStorage offline transfer buffer
│   │   └── webrtc.ts             # P2P WebRTC data connection helper
│   ├── routes/                   # 🛣️ React Router configuration & guards
│   │   ├── README.md
│   │   ├── AppRouter.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── AdminRoute.tsx
│   └── types/                    # 📐 TypeScript definitions
│       ├── README.md
│       ├── database.ts           # Supabase Database schema interfaces
│       └── admin.ts              # Admin role & governance types
└── supabase/                     # 🐘 PostgreSQL Schema & RLS Migrations
    ├── README.md
    └── migrations/               # SQL migration files (0001 to 0019)
```

---

## 🔄 Application Flow & Data Lifecycle

Below is the end-to-end data lifecycle for an encrypted message or file transfer:

```text
[ User Action ] (Send text or file in ChatPage / SendPage)
       ↓
[ Device Identity ] (`src/lib/device.ts` loads local public/private keypair)
       ↓
[ Encryption Layer ] (`src/lib/crypto.ts` encrypts payload with libsodium)
       ↓
[ Network / Queue ] ──(If Offline)──> (`src/lib/offlineQueue.ts` stores in localStorage)
       ↓ (If Online)
[ Supabase Service ] (`src/lib/transfers.ts` / `src/lib/workspace.ts`)
       ↓
[ Storage / Database ] (Supabase Postgres RLS & Private Storage Bucket)
       ↓
[ Realtime Broadcast ] (Supabase Realtime triggers postgres_changes)
       ↓
[ Recipient Device ] (`useTransferAlerts` / `useConversation` receives payload)
       ↓
[ Decryption Layer ] (`src/lib/crypto.ts` decrypts payload locally using private key)
       ↓
[ UI Render & Receipts ] (`ChatPage.tsx` renders content & updates `read_at` / `opened_at`)
```

---

## 🔐 Security & Zero-Knowledge Architecture

1. **Local Key Generation:** Keypairs (`crypto_box_keypair`) are generated locally on device registration via libsodium and stored in browser `localStorage`.
2. **Zero-Knowledge Cloud:** The Supabase database and storage bucket receive *only* ciphertexts, random nonces, and encrypted sym-keys. Plaintexts never transit or exist on the server.
3. **Database Security (RLS):** All 19 SQL migrations enable Row Level Security (RLS) on Postgres tables.
4. **Admin Governance Security:** Admin role changes and bans execute through `SECURITY DEFINER` PL/pgSQL functions (`ovbridge_admin_set_user_ban`, `ovbridge_admin_set_user_role`) that verify caller privileges directly in Postgres.

---

## ⚙️ Environment Variables & Configuration

Create a `.env.local` file in the repository root:

```ini
# Supabase Backend Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

* `VITE_SUPABASE_URL`: Required. Pointing to your Supabase project instance.
* `VITE_SUPABASE_ANON_KEY`: Required. Anonymous public key used for client authentication and RLS requests.

---

## 🚀 Installation & Commands

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher

### Commands

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Execute Oxlint static analysis
npm run lint

# 4. Perform TypeScript typecheck and production build
npm run build

# 5. Preview production build locally
npm run preview
```

---

## 🛠️ Development Guidelines

1. **Adding a New Page or Feature:**
   - Create a feature folder in `src/features/your-feature/`.
   - Implement UI components, custom hooks, and service logic.
   - Register the route in `src/routes/AppRouter.tsx`.
   - Update `README.md` in `src/features/your-feature/` and `src/features/README.md`.
2. **Database Migrations:**
   - Add new SQL files in `supabase/migrations/` following the sequence `00XX_description.sql`.
   - Always enable RLS and specify explicit policies.
   - Update `src/types/database.ts` with new table definitions.
3. **Error Handling:**
   - Throw or catch errors using `AppError` subclasses from `src/lib/errors.ts`.
   - Pass user-facing messages through `friendlyError(err)` for consistent 3-tier severity styling.

---

## 🧯 Maintenance & Troubleshooting

| Issue / Symptom | Possible Cause | Solution |
| :--- | :--- | :--- |
| **`404 Not Found` on Vercel direct links** | Missing SPA rewrite rule | Ensure `vercel.json` contains `{ "source": "/(.*)", "destination": "/index.html" }`. |
| **`CryptoError: Decryption failed`** | Keypair mismatch or missing key | Ensure device identity is registered in `localStorage`. If device was re-paired, re-sync keys. |
| **`Storage 400 Bad Request` on Upload** | Storage path policy mismatch | Ensure workspace upload paths follow `workspace/{userId}/{workspaceId}/{fileId}.enc`. |
| **`WebSocket is closed` Realtime warnings** | Premature channel teardown | Ensure hooks check `channel.state !== "closed"` before calling `removeChannel`. |

---

## 🗺️ Navigable Documentation Map

* [📂 Source Root Documentation](./src/README.md)
  * [🧩 Components Documentation](./src/components/README.md)
  * [🚀 Features Documentation](./src/features/README.md)
    * [🛡️ Admin Console](./src/features/admin/README.md)
    * [🔑 Auth System](./src/features/auth/README.md)
    * [📋 Shared Clipboard](./src/features/clipboard/README.md)
    * [📱 Devices Management](./src/features/devices/README.md)
    * [📜 Legal Documentation](./src/features/legal/README.md)
    * [🔗 Pairing System](./src/features/pairing/README.md)
    * [👤 Profile & Settings](./src/features/profile/README.md)
    * [👥 Collaborative Spaces](./src/features/spaces/README.md)
    * [💬 Messages & Transfers](./src/features/transfers/README.md)
    * [🗄️ Personal Workspace Storage](./src/features/workspace/README.md)
  * [🛠️ Foundational Libraries](./src/lib/README.md)
  * [🛣️ App Router & Guards](./src/routes/README.md)
  * [📐 TypeScript Definitions](./src/types/README.md)
* [🐘 Supabase Database & Migrations](./supabase/README.md)
