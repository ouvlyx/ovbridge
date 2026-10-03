# Presse-papiers Partagé Chiffré (`src/features/clipboard/`)

Permet de synchroniser instantanément du texte entre ses appareils personnels de manière chiffrée.

## 📄 Fichiers

- **`ClipboardPage.tsx`** : Interface affichant l'historique des éléments partagés, avec options de copie rapide, de suppression et d'ajout.
- **`ShareClipboardDialog.tsx`** : Boîte de dialogue permettant de coller ou saisir du texte, intégrant une détection de sensibilité et la prévention des fuites involontaires.
- **`useClipboard.ts`** : Hook React gérant le chargement, le déchiffrement asynchrone et l'abonnement Realtime aux nouveaux éléments.

## 🛡️ Détection de Contenu Sensible

Avant d'envoyer un élément au presse-papiers, le contenu est analysé pour détecter :
- Clés d'API (OpenAI, AWS, GitHub)
- Tokens JWT
- Mots de passe et identifiants
- Numéros de carte bancaire et IBAN
- Clés privées PEM

En cas de détection, un avertissement explicite demande confirmation à l'utilisateur avant le chiffrement et l'envoi.
