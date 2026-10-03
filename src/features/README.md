# Modules Fonctionnels (`src/features/`)

Ce dossier organise l'application par **domaines métiers** (Feature-Driven Architecture).

Chaque sous-dossier contient ses propres pages, composants dédiés, hooks personnalisés et logique d'état local.

## 🗂️ Domaines Disponibles

1. **`auth/`** : Authentification des utilisateurs, gestion des sessions et contexte React `useAuth`.
2. **`clipboard/`** : Synchronisation chiffrée du presse-papiers entre appareils avec détection automatique de secrets (mots de passe, tokens, cartes).
3. **`devices/`** : Liste des appareils de l'utilisateur, état de connexion, renommage, révocation et alertes.
4. **`pairing/`** : Appairage rapide entre appareils par scan de QR code ou saisie manuelle de jeton.
5. **`profile/`** : Gestion des informations du compte utilisateur connecté.
6. **`spaces/`** : Espaces collaboratifs multifonctions permettant le partage d'informations entre plusieurs membres.
7. **`transfers/`** : Messagerie instantanée et transfert sécurisé de fichiers chiffrés de bout en bout.
8. **`workspace/`** : Coffre-fort numérique personnel pour héberger et synchroniser ses fichiers chiffrés.
