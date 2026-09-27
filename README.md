# OvBridge

Pont sécurisé entre vos appareils. Transférez texte, fichiers et documents de téléphone à téléphone, chiffrés de bout en bout.

## Stack

- **Front** : React + Vite + TypeScript + Tailwind v4
- **Backend** : Supabase (Auth, Postgres, Storage, Realtime)
- **Crypto** : libsodium (chiffrement E2E)

## Fonctionnalités

- 🔐 Authentification email / mot de passe
- 📱 Appairage d'appareils via QR code
- 🔒 Chiffrement de bout en bout (le serveur ne voit rien)
- 📄 Transfert de texte et de fichiers
- ⚡ Temps réel (mises à jour instantanées)

## Dev

```bash
npm install
cp .env.example .env.local
# Remplir avec tes clés Supabase
npm run dev# ovbridge
