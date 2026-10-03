# Espaces Collaboratifs (`src/features/spaces/`)

Permet de créer des groupes d'échange (famille, amis, équipe) et d'y partager textes et fichiers chiffrés.

## 📄 Fichiers

- **`SpacesPage.tsx`** : Vue synthétique des espaces dont l'utilisateur est membre ou administrateur.
- **`SpaceDetailPage.tsx`** : Gestion détaillée d'un espace (liste des membres, rôles admin/membre, invitation, suppression).
- **`CreateSpaceDialog.tsx`** : Modale de création d'un nouvel espace.
- **`InviteToSpaceDialog.tsx`** : Génération de code d'invitation avec expiration (24h).
- **`JoinSpacePage.tsx`** : Interface pour rejoindre un espace via son code d'invitation.
- **`useSpaces.ts`** : Hook React récupérant la liste des espaces avec écoute Realtime.
- **`useSpaceDetail.ts`** : Hook React supervisant les membres et métadonnées d'un espace précis.

## 🔒 Gestion Sécurisée des Échanges en Espace

L'envoi vers un espace repose sur un modèle de fan-out sécurisé (`sendTextToSpace`, `sendFileToSpace`) : le contenu est chiffré individuellement avec la clé publique de chaque appareil actif de chaque membre de l'espace.
