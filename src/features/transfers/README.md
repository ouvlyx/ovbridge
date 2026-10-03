# Messagerie & Transferts Sécurisés (`src/features/transfers/`)

Module central pour l'échange de messages et de fichiers chiffrés de bout en bout (E2E).

## 📄 Fichiers

- **`ChatPage.tsx`** : Interface de messagerie instantanée fluide avec défilement automatique, envoi de pièces jointes et déchiffrement à la volée.
- **`MessagesPage.tsx`** : Liste récapitulative des conversations directes (appareil à appareil) et collectives (espaces) avec compteur de non-lus.
- **`InboxPage.tsx`** : Boîte de réception globale listant les transferts reçus.
- **`SendPage.tsx`** : Interface d'envoi rapide ciblant un appareil précis.
- **`useConversation.ts`** : Hook supervisant les messages d'un fil de discussion avec debounce et mise à jour Realtime.
- **`useTransferAlerts.ts`** : Alertes sonores/visuelles toast lors de l'arrivée d'un nouveau transfert.
- **`useTransfers.ts`** : Chargement et pagination des transferts.
- **`useUnreadCount.ts`** : Compteur global de messages non lus en temps réel.
- **`index.ts`** : Exportations du module.
