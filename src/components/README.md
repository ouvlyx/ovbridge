# Composants Partagés (`src/components/`)

Ce dossier regroupe les composants visuels transversaux de l'application OvBridge.

## 📄 Contenu

- **`ui/`** : Bibliothèque de composants atomiques d'interface utilisateur (boutons, badges, modales, champs de formulaire, menus déroulants).
- **`NetworkStatusBanner.tsx`** : Bandeau d'état réseau persistant affiché automatiquement lorsque la connexion Internet de l'appareil est interrompue, alertant l'utilisateur de manière discrète sans bloquer son travail.

## 💡 Principes de Conception

1. **Accessibilité (a11y)** : Utilisation des primitives Radix UI fournissant la gestion complète du focus clavier, des rôles ARIA et des lecteurs d'écran.
2. **Cohérence Visuelle** : Respect de la palette de couleurs OvBridge (`ov-primary`, `ov-bg`, `ov-surface`, `ov-border`, `ov-danger`, etc.).
3. **Isolation et Modularité** : Respect strict des contraintes React Fast Refresh pour une compilation et un rechargement à chaud optimaux.
