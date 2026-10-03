# Espace de Stockage Personnel Workspace (`src/features/workspace/`)

Espace cloud personnel sécurisé (Zero-Knowledge) pour stocker et synchroniser des documents chiffrés.

## 📄 Fichiers

- **`WorkspacePage.tsx`** : Interface de gestion des fichiers (upload, export, suppression, prévisualisation, jauge de quota).
- **`useWorkspace.ts`** : Hook assurant l'initialisation automatique (`ensureWorkspace`) et le suivi du quota de stockage en temps réel.
- **`useWorkspaceFiles.ts`** : Hook récupérant la liste des fichiers chiffrés avec détection d'état en cache local.

## 💾 Quota & Stockage

- Chaque utilisateur dispose d'un espace personnel avec un quota par défaut de 100 Mo.
- La procédure stockée SQL `ovbridge_add_workspace_usage` ajuste dynamiquement l'espace consommé lors des ajouts et suppressions de fichiers.
