# Appairage d'Appareils (`src/features/pairing/`)

Gère l'introduction sécurisée et l'appairage cryptographique d'un nouvel appareil à un compte existant.

## 📄 Fichiers

- **`PairingPage.tsx`** : Génère un QR Code dynamique et un jeton textuel court (format `XXXX-XXXX`) renouvelable.
- **`ScanPage.tsx`** : Interface de capture vidéo exploitant la caméra de l'appareil (`html5-qrcode`) pour décoder instantanément le QR code d'appairage.
- **`JoinPage.tsx`** : Interface de saisie du jeton d'appairage permettant à un appareil récepteur de rejoindre le compte.
- **`usePairing.ts`** : Hook React supervisant la durée de validité du jeton et sa consommation atomique.
- **`index.ts`** : Exportations du module.

## 🛡️ Sécurité de l'Appairage

- Les jetons d'appairage ont une durée de vie limitée (5 minutes).
- Les jetons sont à usage unique strict : la consommation s'effectue via une procédure stockée SQL atomique (`ovbridge_consume_pairing_token`).
- Les erreurs de token (expiré, déjà utilisé, inconnu) déclenchent des exceptions claires `PairingError`.
