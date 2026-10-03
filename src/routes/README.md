# Routage de l'Application (`src/routes/`)

Configuration de la navigation SPA avec **React Router v7**.

## 📄 Fichiers

- **`AppRouter.tsx`** : Déclaration des routes publiques (`/login`, `/signup`, `/join`, `/scan`, etc.) et protégées avec chargement différé (`lazy` + `Suspense`).
- **`ProtectedRoute.tsx`** : Garde-fou vérifiant la présence d'une session Supabase active avant d'autoriser l'accès aux pages privées.
