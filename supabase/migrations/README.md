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

L'audit statique a vérifié les dépendances des migrations dans cet ordre.
L'exécution réelle doit être confirmée avec `npx supabase db reset` dans un
environnement Supabase local configuré.
