# Migrations Supabase

Les migrations sont exécutées par ordre lexicographique des noms. Ne pas
renommer ni réordonner les fichiers déjà appliqués.

## Ordre d'exécution

1. `0001_init.sql` — profils, appareils, jetons d'appairage, transferts et
   bucket privé `ovbridge_files`.
2. `0002_pairing_realtime.sql` — ajout des jetons d'appairage à Realtime.
3. `0003_spaces.sql` — espaces, membres, invitations, RPC et policies associées.
4. `0004_transfers_read.sql` — `read_at` et index des transferts par espace.
5. `0005_device_revocation_guard.sql` — garde-fous de révocation.
6. `0006_space_storage_read.sql` — lecture des fichiers d'espace par leurs membres.
7. `0007_transfer_read_permissions.sql` — permissions contrôlées de lecture.
8. `0008_atomic_pairing_token.sql` — consommation atomique des codes.
9. `0009_restrict_helper_function_exec.sql` — droits des fonctions auxiliaires.
10. `0010_rotate_pairing_token.sql` — création et rotation atomiques des codes.
11. `0011_transfer_recipient_read.sql` — lecture des transferts destinés aux appareils.
12. `0012_seen.sql` — ajout de `seen_at` aux appareils.
13. `0013_workspace_and_clipboard.sql` — tables pour le presse-papiers partagé (`ovbridge_clipboard`), espaces personnels (`ovbridge_workspaces`, `ovbridge_workspace_files`) et fonction d'ajustement de quota (`ovbridge_add_workspace_usage`).
14. `0014_clipboard_preview_privacy.sql` — efface les aperçus plaintext déjà stockés.
15. `0015_clipboard_preview_guard.sql` — interdit les aperçus plaintext et borne la taille des nouveaux textes chiffrés.
16. `0016_workspace_storage_policies.sql` — autorise le Storage Workspace uniquement à son propriétaire.
17. `0017_admin_system.sql` — tables et règles de gouvernance de l'administration.
18. `0018_extended_profile_and_settings.sql` — champs de profil et préférences utilisateur.
19. `0019_workspace_storage_and_opened_traces.sql` — suivi d'ouverture et évolutions du stockage.
20. `0020_workspace_shared_key.sql` — partage de clés de workspace entre appareils.
21. `0021_call_miltiple.sql` — évolutions des appels de groupe.
22. `0022_transfers_composite_index.sql` — index composite des transferts.
23. `0023_clipboard_multi_device_keys.sql` — clés de chiffrement du presse-papiers enveloppées pour chaque appareil.
24. `0024_lock_profile_privileges.sql` — interdit l’auto-attribution de rôles admin, limite les fonctions auxiliaires à l’utilisateur connecté, masque les coordonnées détaillées des membres et verrouille les salles d’appel et journaux d’administration.

## Recréer une base locale

Prérequis : Docker Desktop en cours d'exécution et Supabase CLI. Si le dépôt
n'a pas encore de `supabase/config.toml`, initialiser d'abord la configuration
locale depuis la racine du projet.

```sh
npx supabase init
npx supabase start
npx supabase db reset
```

`db reset` recrée la base locale et applique toutes les migrations dans l'ordre.
Ne pas exécuter cette commande contre une base distante contenant des données.

## Prérequis Supabase

- Utiliser une base Supabase (ou son environnement local CLI), qui fournit les
  schémas `auth` et `storage`, les rôles `authenticated`, `anon` et `service_role`,
  la fonction `auth.uid()` et la publication `supabase_realtime`.
- La migration `0001_init.sql` crée le bucket `ovbridge_files` privé si le
  service Storage est disponible. Vérifier qu'il reste privé après migration.
- Realtime doit être disponible; `0001_init.sql`, `0002_pairing_realtime.sql`
  et `0003_spaces.sql` ajoutent les tables requises à `supabase_realtime`.
- Activer Anonymous sign-ins dans Supabase Auth si le parcours invité est utilisé.
- Pour une instance distante neuve, lier le projet avec `npx supabase link`
  puis appliquer les migrations avec `npx supabase db push`.

## E-mails d’authentification pour les tests

Pour autoriser les inscriptions de test vers des adresses externes sans nom de
domaine, une adresse Gmail dédiée peut être utilisée temporairement comme SMTP
personnalisé. Activez la validation en deux étapes sur ce compte et créez un mot
de passe d’application. Dans Supabase Dashboard → Authentication → SMTP
Settings, configurez `smtp.gmail.com`, le port `587`, l’adresse Gmail comme
utilisateur et expéditeur, et le mot de passe d’application comme mot de passe.

Désactivez également le Send Email Hook distant qui pointe vers
`pg-functions://postgres/ouvchat/send_email_hook`, puisqu’il n’existe pas dans
ce dépôt et empêcherait le nouvel envoi SMTP. Ne placez jamais le mot de passe
d’application dans le dépôt ou dans le client. Cette configuration est réservée
aux tests; pour la production, utilisez un fournisseur transactionnel et un
domaine d’envoi que vous contrôlez.

Pour une bêta limitée aux personnes invitées, désactivez aussi les inscriptions
publiques dans Supabase Dashboard → Authentication → Settings → User Signups.
Le réglage `VITE_PUBLIC_SIGNUP_ENABLED=false` masque le formulaire côté Vercel,
mais ne remplace pas cette protection côté serveur. Envoyez les invitations
depuis Supabase Dashboard → Authentication → Users → Invite user. Vérifiez
qu’un utilisateur non invité ne peut pas créer de compte, y compris par OAuth,
avant de publier le lien de bêta.

L'audit statique a vérifié les dépendances des migrations dans cet ordre.
L'exécution réelle doit être confirmée avec `npx supabase db reset` dans un
environnement Supabase local configuré.
