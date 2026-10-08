# 💬 `src/features/transfers/` — Messages & File Sharing

This module handles real-time encrypted messaging, file transfers, chat conversations, inbox monitoring, and unread counts.

---

## 📋 File Index

| File | Route | Responsibility |
| :--- | :--- | :--- |
| `MessagesPage.tsx` | `/messages` | Unified communications list displaying active direct and space conversations |
| `SendPage.tsx` | `/send` | Direct message/file dispatch launcher with drag-and-drop file support |
| `ChatPage.tsx` | `/messages/:kind/:id` | Real-time chat conversation view rendering encrypted texts, file attachments, and open/read checkmark receipts (`read_at`, `opened_at`) |
| `InboxPage.tsx` | `/inbox` | List of unread incoming transfers |
| `useConversation.ts` | — | Hook managing real-time chat messages and automatic decryption |
| `useTransfers.ts` | — | Hook fetching raw transfer records |
| `useTransferAlerts.ts` | — | Global realtime listener triggering universal audio, vibe, and push notifications for incoming transfers |
| `useUnreadCount.ts` | — | Hook tracking unread transfer count for badge indicators |

---

## 🧭 Navigation Links
* [⬅️ Back to Features Index (`src/features/`)](../README.md)
* [🌟 Master PROJECT.md](../../PROJECT.md)
