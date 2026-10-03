# Gestion des Appareils (`src/features/devices/`)

Module de visualisation et de gestion des appareils connectés au compte OvBridge.

## 📄 Fichiers

- **`DevicesPage.tsx`** : Page principale listant tous les appareils enregistrés avec leur plateforme, leur date de dernière activité et leurs statuts.
- **`RenameDeviceDialog.tsx`** : Boîte de dialogue pour personnaliser le libellé d'un appareil.
- **`ConfirmDialog.tsx`** : Modale de confirmation pour les actions destructives ou critiques (ex: révocation).
- **`useDevices.ts`** : Hook React gérant la liste des appareils avec synchronisation Realtime Supabase.
- **`useDeviceAlerts.ts`** : Hook écoutant l'enregistrement de nouveaux appareils pour afficher des alertes visuelles.
- **`index.ts`** : Exportations du module.

## 🌐 Résilience Réseau & Hors-Ligne

Si l'appareil perd sa connexion Internet :
- L'identité locale et la clé privée stockées sont scrupuleusement préservées.
- Aucun appareil n'est révoqué par inadvertance lors d'un échec réseau temporaire.
