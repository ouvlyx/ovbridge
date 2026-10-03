# Architecture Source OvBridge (`src/`)

Ce dossier regroupe le code source frontend et logique métier de l'application **OvBridge**.

## 📁 Arborescence des dossiers

- **`assets/`** : Ressources graphiques (icônes d'application iOS, Android, web).
- **`components/`** : Composants React réutilisables, incluant les composants génériques d'interface utilisateur (`components/ui/`) et les bandeaux système (`NetworkStatusBanner.tsx`).
- **`features/`** : Modules fonctionnels découpés par domaine métier :
  - `auth` : Authentification, sessions, profils et contexte utilisateur.
  - `clipboard` : Presse-papiers partagé chiffré de bout en bout et détection de données sensibles.
  - `devices` : Gestion des appareils appairés, révocation, renommage et alertes.
  - `pairing` : Appairage sécurisé via QR Code et saisie de jeton rotatif.
  - `profile` : Consultation et modification du profil utilisateur.
  - `spaces` : Espaces collaboratifs multifonctions (partage à plusieurs).
  - `transfers` : Messagerie et échange de fichiers chiffrés E2E, conversations directes et de groupe.
  - `workspace` : Espace de stockage personnel dans le cloud chiffré côté client avec quota.
- **`lib/`** : Bibliothèque centrale d'utilitaires et logique coeur :
  - `crypto.ts` : Fonctions cryptographiques libsodium (box, secretbox, hashing).
  - `device.ts` : Gestion de l'identité locale, génération et conservation des paires de clés.
  - `errors.ts` : Système d'exceptions typées (`AppError`, `NetworkError`, `AuthError`, etc.).
  - `network.ts` : Détection hors-ligne, reprise sur reconnexion et mécanisme de relance (retry).
  - `supabase.ts` : Client Supabase configuré pour Auth, Storage, Database et Realtime.
  - `localCache.ts` : Cache local persistant (Capacitor natif ou mémoire web sécurisée).
  - `qr.ts` : Validation, formatage et parsing des jetons et URLs d'appairage QR.
- **`routes/`** : Définition des routes publiques et protégées de l'application avec `react-router-dom`.
- **`types/`** : Définitions TypeScript globales et typages de base de données.

## 🔐 Modèle de Sécurité (Zero-Knowledge)

Toutes les données sensibles (textes, fichiers, presse-papiers) sont chiffrées sur l'appareil émetteur avant tout envoi vers le serveur ou stockage Supabase. Les clés privées sont conservées localement dans le stockage sécurisé de l'appareil et ne transitent jamais sur le réseau.
