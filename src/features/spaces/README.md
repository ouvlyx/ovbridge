# 👥 `src/features/spaces/` — Collaborative Spaces

This module manages collaborative group spaces, space invitations, member lists, and common space communication hubs.

---

## 📋 File Index

| File | Route | Responsibility |
| :--- | :--- | :--- |
| `SpacesPage.tsx` | Embedded in `/devices` | List of collaborative spaces with common public space hub banner |
| `SpaceDetailPage.tsx` | `/spaces/:id` | Detailed space view showing space members, invitations, and file transfers |
| `JoinSpacePage.tsx` | `/join-space` | View for accepting an invitation code to join a collaborative space |
| `CreateSpaceDialog.tsx` | — | Modal dialog for creating a new collaborative space |
| `InviteToSpaceDialog.tsx` | — | Modal dialog for generating shareable space invitation tokens |
| `useSpaces.ts` | — | Hook fetching user space memberships and active spaces |
| `useSpaceDetail.ts` | — | Hook managing members and details for a specific space |

---

## 🧭 Navigation Links
* [⬅️ Back to Features Index (`src/features/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
