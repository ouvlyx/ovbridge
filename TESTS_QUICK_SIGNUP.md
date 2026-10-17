# 🧪 Protocoles de Tests Manuels — Inscription "Pseudo First" OvBridge

Ce document détaille les scénarios de test manuel pour valider le système d'inscription rapide Pseudo First sur OvBridge.

---

## 1. 🚀 Tests d'Inscription Rapide (`/quick-signup`)

- [ ] **Génération et Affichage des Suggestions**
  - Accéder à `/quick-signup`
  - Vérifier la présence de 4 cartes de pseudos suggérés en grille 2×2
  - Vérifier que l'avatar dynamique se met à jour instantanément selon la sélection
  - Cliquer sur le bouton **"Autres suggestions"** et vérifier qu'une nouvelle liste de 4 pseudos est générée sans erreur

- [ ] **Inscription avec Pseudo Suggéré**
  - Laisser un pseudo suggéré sélectionné
  - Cliquer sur **"Créer mon espace"**
  - Vérifier le feedback de chargement (indicateur animé)
  - Vérifier la notification Toast de succès (`Bienvenue [Pseudo]`)
  - Vérifier la redirection automatique vers le tableau de bord (`/devices`)

- [ ] **Inscription avec Pseudo Personnalisé (Valide)**
  - Sur `/quick-signup`, cliquer sur **"Je préfère créer mon propre pseudo"**
  - Saisir un pseudo personnalisé valide (ex: `Astra-Rift`)
  - Vérifier l'indicateur visuel de vérification de disponibilité (Debounce ~300ms)
  - Vérifier l'icône de coche verte et le message *"Pseudo disponible !"*
  - Soumettre et vérifier la création de l'espace

- [ ] **Inscription avec Pseudo Personnalisé (Déjà Pris ou Invalide)**
  - Basculer en mode pseudo personnalisé
  - Saisir un pseudo déjà enregistré en base ou trop court (< 3 caractères)
  - Vérifier l'apparition de l'indicateur rouge et du message d'erreur
  - Vérifier que le bouton **"Créer mon espace"** reste désactivé

---

## 2. 🔑 Tests de Connexion et Stockage (`/login`)

- [ ] **Connexion avec Identifiants Générés**
  - Se déconnecter de l'application
  - Aller sur `/login`
  - Utiliser l'email interne (`[pseudo].[timestamp]@guest.ouvlyx.com`) et le mot de passe automatique sauvegardés dans le local storage
  - Valider et vérifier la connexion réussie

- [ ] **Test de Saisie Erronée**
  - Tenter de se connecter avec un pseudo ou mot de passe incorrect
  - Vérifier l'affichage du message d'erreur d'authentification approprié

---

## 3. 🛡️ Tests de Récupération de Compte (`/recover`)

- [ ] **Recherche d'un Compte Existant sur le Même Appareil**
  - Naviguer vers `/recover`
  - Entrer un pseudo enregistré sur cet appareil
  - Cliquer sur **"Retrouver mon compte"**
  - Vérifier que les identifiants locaux enregistrés s'affichent avec les boutons de copie
  - Cliquer sur les boutons **"Copier"** et vérifier le retour visuel (toast de confirmation)

- [ ] **Recherche d'un Compte depuis un Nouvel Appareil (sans stockage local)**
  - Effacer le `localStorage` ou utiliser une fenêtre de navigation privée
  - Aller sur `/recover` et rechercher le pseudo
  - Vérifier l'affichage du message explicatif : *"Compte trouvé. Connecte-toi depuis un appareil déjà lié..."*

---

## 4. 👤 Tests du Profil et de la Sécurité (`/profile`)

- [ ] **Affichage et Masquage des Identifiants**
  - Sur la page `/profile`, repérer la section **"Mes identifiants"**
  - Cliquer sur **"Afficher"** et vérifier le masque/démasque de l'identifiant et du mot de passe
  - Tester la copie via le bouton dédié

- [ ] **Génération d'un Nouveau Mot de Passe**
  - Dans la section Sécurité, cliquer sur **"Générer un nouveau mot de passe"**
  - Vérifier la mise à jour immédiate du mot de passe en mémoire locale et sur Supabase Auth
  - Vérifier la notification toast de confirmation

- [ ] **Ajout d'un Vrai Email de Récupération**
  - Cliquer sur **"Ajouter un vrai email"**
  - Saisir une adresse e-mail valide dans le modal
  - Valider et vérifier la réception/notification d'envoi du lien de confirmation

---

## 5. 📱 Tests de l'Modal d'Onboarding (`QuickOnboardingModal`)

- [ ] **Déclenchement Automatique Post-Inscription**
  - Effectuer une nouvelle inscription rapide
  - Vérifier l'ouverture automatique du modal à 3 étapes sur la page d'accueil
  - Parcourir les 3 étapes (Étape 1: Présentation, Étape 2: QR Code d'appairage, Étape 3: Validation)
  - Terminer l'onboarding et vérifier que le modal ne réapparaît plus lors des rechargements suivants

---

## 6. 📐 Tests d'Ergonomie et Responsive

- [ ] **Affichage Mobile (iPhone / Android viewport < 640px)**
  - Tester la grille de suggestions 2x2 et le dimensionnement des boutons
  - S'assurer de la lisibilité des textes et de l'absence de débordements horizontaux
- [ ] **Affichage Desktop (viewport > 1024px)**
  - Vérifier le centrage et la netteté de la carte QuickStartCard et de la page Profil
