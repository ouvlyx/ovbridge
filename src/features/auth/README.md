# Module d'Authentification (`src/features/auth/`)

Gère la sécurité, la connexion, l'inscription et le maintien de la session utilisateur.

## 📄 Fichiers

- **`AuthContext.ts`** : Définition du contexte d'authentification React et de son typage.
- **`AuthProvider.tsx`** : Fournisseur de contexte englobant l'application, gérant les états de session et la synchronisation avec Supabase Auth.
- **`useAuth.ts`** : Hook React permettant à n'importe quel composant d'accéder à l'utilisateur courant, à la session et aux actions (`signIn`, `signUp`, `signOut`).
- **`LoginPage.tsx`** : Page de connexion par email et mot de passe.
- **`SignupPage.tsx`** : Page de création de compte.
- **`ConfirmPage.tsx`** : Page de confirmation d'email.
- **`index.ts`** : Point d'entrée exportant les composants et hooks du module.

## 🔒 Gestion des Erreurs

Les erreurs d'authentification sont interceptées et converties en exceptions typées `AuthError` avec messages clairs en français pour l'utilisateur (identifiants erronés, email déjà pris, session expirée).
