# Bibliothèque Centrale (`src/lib/`)

Regroupe les briques fondamentales techniques, cryptographiques et réseau d'OvBridge.

## 📄 Fichiers

- **`crypto.ts`** : Fonctions cryptographiques reposant sur **libsodium** (box asymétrique X25519-XSalsa20-Poly1305 pour le texte, secretbox symétrique pour les fichiers).
- **`device.ts`** : Gestion de l'identité de l'appareil local, persistance des paires de clés et protection contre l'effacement accidentel hors-ligne.
- **`errors.ts`** : Système complet d'exceptions typées (`AppError`, `NetworkError`, `AuthError`, `CryptoError`, `DeviceError`, `PairingError`, `TransferError`, `SpaceError`, `WorkspaceError`, `ClipboardError`) et formattage convivial (`friendlyError`).
- **`network.ts`** : Détection réseau en temps réel (`useNetworkStatus`, `isOnline`), reconnexion automatique des sockets Realtime et relances exponentielles (`withRetry`).
- **`supabase.ts`** : Instance initialisée du client Supabase avec persistance locale des sessions.
- **`localCache.ts`** : Gestion du cache physique des fichiers chiffrés/déchiffrés (FS natif via Capacitor ou mémoire vive sécurisée pour le web).
- **`spaces.ts`** : Logique métier des espaces (création, invitations, listing des appareils cibles pour le fan-out).
- **`transfers.ts`** : Envoi et déchiffrement des textes et fichiers, agrégation des conversations et mise en cache du texte clair émis.
- **`workspace.ts`** : Opérations sur les fichiers du coffre personnel (chiffrement, upload, download, calcul de quota).
- **`qr.ts`** : Utilitaires de validation, nettoyage et génération d'URLs pour les codes QR d'appairage.
- **`clipboard.ts`** : Envoi au presse-papiers sécurisé, détection heuristique de secrets et historique.
- **`utils.ts`** : Fonction utilitaire `cn` pour la fusion de classes Tailwind via `clsx` et `tailwind-merge`.
- **`constants.ts`** : Constantes applicatives (tailles maximales de fichiers, timeouts).
