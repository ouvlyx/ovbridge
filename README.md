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

## Déploiement

### Prérequis

- Node.js 20.19+ ou 22.12+ et npm (versions compatibles avec Vite 8).

### Variables d'environnement

Créer `.env.local` à la racine, à partir de `.env.example`, puis renseigner :

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Ne jamais exposer ni utiliser une clé `service_role` dans le frontend.

### Développement et build

```bash
npm install
npm run dev
npm run build
```

### Supabase

1. Créer un projet Supabase.
2. Installer la CLI, s'authentifier et lier le projet.
3. Appliquer les migrations dans l'ordre documenté dans `supabase/migrations/README.md`.
4. Activer **Anonymous Sign-Ins** si le mode invité est utilisé.
5. Vérifier que le bucket `ovbridge_files` existe et reste privé (il est créé par la première migration).
6. Configurer un SMTP personnalisé pour les courriels d'authentification : [guide Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

### Hébergement frontend

Vercel et Netlify détectent Vite. La commande de build est `npm run build` et le dossier généré est `dist`. Définir les deux variables `VITE_SUPABASE_*` dans les variables d'environnement du fournisseur.

Le site de production doit être servi en HTTPS : l'accès caméra pour le scan QR exige un contexte sécurisé. Le mode invité dépend aussi de la disponibilité de Supabase Auth depuis l'origine HTTPS.

### Avertissements statiques connus

`npm run lint` ne signale actuellement aucune erreur, mais conserve les avertissements suivants :

- Exports mixtes composants/valeurs pour Fast Refresh dans `src/components/ui/button.tsx` et `src/features/auth/AuthProvider.tsx`.
- Dépendances `scope` signalées par `react-hooks/exhaustive-deps` dans `src/features/transfers/useConversation.ts` et `src/features/transfers/ChatPage.tsx`.
- Mise à jour d'état dans un effet signalée dans `src/features/pairing/JoinPage.tsx` et `src/features/spaces/useSpaceDetail.ts`.
- Paramètre d'exception inutilisé dans `src/features/transfers/ChatPage.tsx`.

Ces avertissements sont suivis comme dette technique; ils ne sont pas désactivés par configuration.
