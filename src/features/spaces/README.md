# 👥 `src/features/spaces/` — Collaborative Spaces

This module manages collaborative group spaces, space invitations, member lists, and common space communication hubs.

---

## 📋 File Index

| File | Route | Responsibility |
| :--- | :--- | :--- |
| `SpacesPage.tsx` | Embedded in `/devices` | List of collaborative spaces with common public space hub banner |
| `SpaceDetailPage.tsx` | `/spaces/:id` | Detailed space view showing space members, invitations, and file transfers |
| `ProjectStoragePage.tsx` | `/spaces/:id/storage` | Project-only encrypted file drive with shared quota and member-device key synchronization |
| `JoinSpacePage.tsx` | `/join-space` | View for accepting an invitation code to join a collaborative space |
| `CreateSpaceDialog.tsx` | — | Modal dialog for creating a new collaborative space |
| `InviteToSpaceDialog.tsx` | — | Modal dialog for generating shareable space invitation tokens |
| `useSpaces.ts` | — | Hook fetching user space memberships and active spaces |
| `useSpaceDetail.ts` | — | Hook managing members and details for a specific space |

The project drive is stored in `ovbridge_project_files` and
`ovbridge_project_keys`; it does not use the personal `ovbridge_workspaces`
tables. Access is restricted by project membership in migration 0025. New
members' approved devices need a project admin to synchronize the project key.
Removing a member revokes server access and removes their device wraps, but
cannot erase files or keys already downloaded to their devices.

---

## 🧭 Navigation Links
* [⬅️ Back to Features Index (`src/features/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
