# 💡 Recommandations et Améliorations Futures — Pseudo First OvBridge

Voici la synthèse des 5 améliorations recommandées pour faire évoluer le système d'inscription "Pseudo First" d'OvBridge.

---

### 1. Synchronisation automatique des identifiants via QR Code d'appairage
- **Description :** Permettre au second appareil de flasher le QR Code du premier appareil connecté afin de récupérer et déchiffrer instantanément les identifiants locaux (`ovbridge_saved_credentials`) sans aucune saisie manuelle.
- **Impact :** **Fort** (fluidifie drastiquement l'onboarding multi-appareils).
- **Effort :** **2 jours**.

---

### 2. Export / Sauvegarde de la Clé de Secours (Backup Key PDF / Passkey)
- **Description :** Offrir à l'utilisateur la possibilité de télécharger un document PDF chiffré ou de générer une phrase mnémonique (style 12 mots seed phrase) pour récupérer son espace même en cas de perte de tous ses appareils.
- **Impact :** **Fort** (garantit une souveraineté zéro-donnée perdue).
- **Effort :** **2 jours**.

---

### 3. Conversion transparente "Guest" vers Compte Email/OAuth Réel
- **Description :** Proposer un bandeau discret ou une relance douce incitant l'utilisateur invité à convertir son pseudo en compte permanent avec un vrai e-mail ou via Google OAuth sans perdre aucun transfert ni espace.
- **Impact :** **Moyen**.
- **Effort :** **1 jour**.

---

### 4. Avatars personnalisés génératifs et SVG Avatars
- **Description :** Enrichir les avatars auto-générés avec des motifs géométriques vectoriels (DiceBear / Avataaars / Robohash) au lieu du seul gradient d'initiales, apportant une touche visuelle moderne et unique.
- **Impact :** **Faible / Moyen** (amélioration esthétique et engagement utilisateur).
- **Effort :** **0.5 jour**.

---

### 5. Nettoyage automatique des comptes invités temporaires inactifs (Retention TTL)
- **Description :** Mettre en place une tâche programmée (Cron Supabase / Pg_cron) qui supprime les comptes invités non liés et inactifs depuis plus de 90 jours (si aucun vrai email n'a été rattaché).
- **Impact :** **Moyen** (optimisation du stockage et hygiène de la base de données).
- **Effort :** **1 jour**.
