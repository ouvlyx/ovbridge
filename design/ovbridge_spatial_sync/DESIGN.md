---
name: OvBridge Spatial Sync
colors:
  surface: '#121317'
  surface-dim: '#121317'
  surface-bright: '#38393e'
  surface-container-lowest: '#0d0e12'
  surface-container-low: '#1a1b20'
  surface-container: '#1e1f24'
  surface-container-high: '#292a2e'
  surface-container-highest: '#343439'
  on-surface: '#e3e2e8'
  on-surface-variant: '#c9c4d8'
  inverse-surface: '#e3e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#938ea1'
  outline-variant: '#484555'
  surface-tint: '#cabeff'
  primary: '#cabeff'
  on-primary: '#31009a'
  primary-container: '#947dff'
  on-primary-container: '#2a0088'
  inverse-primary: '#603ce2'
  secondary: '#6fffe8'
  on-secondary: '#003730'
  secondary-container: '#00e5cc'
  on-secondary-container: '#006156'
  tertiary: '#1be37c'
  on-tertiary: '#00391a'
  tertiary-container: '#00a657'
  on-tertiary-container: '#003116'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4816cb'
  secondary-fixed: '#41fce2'
  secondary-fixed-dim: '#00dfc6'
  on-secondary-fixed: '#00201b'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#5fff9a'
  tertiary-fixed-dim: '#1be37c'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005228'
  background: '#121317'
  on-background: '#e3e2e8'
  surface-variant: '#343439'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.015em
  title-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.01em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 12px
  gutter-tablet: 16px
  gutter-desktop: 20px
  margin: 16px
  margin-tablet: 24px
  margin-desktop: 32px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-lg: 16px
  space-xl: 24px
---

## Brand & Style

Le système incarne la métaphore du "pont invisible" : une passerelle dématérialisée, fluide et souveraine reliant plusieurs terminaux au sein d'un maillage chiffré de bout en bout. L'expérience s'adresse à des utilisateurs techniques, créatifs et exigeants en matière de confidentialité (développeurs, designers, profils tech-forward habitués aux outils comme Linear, Arc, Raycast et Vercel).

L'esthétique fusionne le **minimalisme technique** et la **profondeur spatiale** :
- **Atmosphère nocturne abyssale** (#08090D) où les éléments semblent flotter en lévitation contrôlée.
- **Micro-surfaces translucides et halos spectraux** (violet électrique et cyan menthe) indiquant l'état cryptographique, la proximité pair-à-pair et la synchronisation en direct.
- **Rigueur utilitaire et précision d'ingénierie** : typographies néo-grotesques nettes complétées par du monospace pour l'empreinte cryptographique, les clés publiques et les métadonnées de transfert.
- **Micro-interactions directes et silencieuses** : retour haptique visuel, lueurs douces en lieu et place d'ombres portées classiques, sensation de transmission instantanée et sécurisée.

## Colors

La palette s'articule autour d'une base ultra-sombre permettant aux émissions lumineuses violettes et cyan de signifier la connectivité et la confiance cryptographique sans saturer le regard.

- **Fonds & Surfaces structurelles :**
  - Fond d'écran (`background`) : `#08090D` (noir profond spatial).
  - Surface conteneur (`surface`) : `#0F1117` (cartes, listes, panneaux récepteurs).
  - Surface surélevée (`surface-raised`) : `#161923` (tiroirs d'action, modales, bannières d'état, headers flottants).
- **Lignes & Séparateurs :**
  - Bordure subtile (`border-subtle`) : `#1E2230` (délimitation des cartes et séparateurs de listes).
  - Bordure d'accentuation (`border-strong`) : `#2A2F40` (champs actifs, périphériques appairés, focus).
- **Couleurs d'action & Sécurité :**
  - Primaire (`primary`) : `#7C5CFF` (violet électrique — synchronisation principale, actions pivots, statut chiffré).
  - Lueur primaire (`primary-glow`) : `#9B87FF` (halo d'émission, survol d'appareil actif).
  - Accentuation (`accent`) : `#00E5CC` (cyan menthe — liaison temps réel, presse-papier partagé, passerelle streaming).
  - Succès (`success`) : `#22E67E` (chiffrement E2E validé, transfert achevé).
  - Danger (`danger`) : `#FF5B5B` (rupture de liaison, révocation de clé, interruption d'appel).
  - Avertissement (`warning`) : `#FFB547` (nouveau nœud non vérifié, bande passante limitée).
- **Niveaux de lisibilité typographique :**
  - Texte primaire (`text-primary`) : `#F5F6FA` (titres, valeurs décisives).
  - Texte secondaire (`text-secondary`) : `#9096A6` (descriptions, statuts secondaires, noms de fichiers).
  - Texte atténué (`text-muted`) : `#5A6172` (placeholders, timestamps, empreintes de certificats).

## Typography

La hiérarchie typographique répond à la double exigence de lisibilité spatiale et de rigueur cryptographique.

- **Geist** assure la clarté moderne des titres et du corps de texte, avec un crénage resserré sur les niveaux de titre pour un impact compact proche des interfaces d'ingénierie contemporaines.
- **JetBrains Mono** est strictement dédié aux artéfacts techniques : clés de chiffrement (empreintes SHA-256), horodatages de transfert, taille de paquets réseau, adresses IP locales et badges de protocole.
- Sur mobile (largeur 375px), le ratio d'interlignage demeure généreux afin de garantir un confort de lecture optimal en mobilité.
- Les libellés d'état système (`label-caps`) sont affichés en majuscules avec un espacement positif afin de souligner les statuts matériels (ex. `CHICHRÉ E2E`, `EN LIGNE`, `SYSTÈME ACTIF`).

## Layout & Spacing

Le dimensionnement repose sur une grille fluide optimisée pour une approche **mobile-first (375x812px)**, tout en s'adaptant continuellement vers les formats tablette et poste fixe.

- **Grille & Marges mobiles :** 
  - Marges extérieures de 16px (`margin`) pour préserver l'espace utile sur formats compacts.
  - Gouttières de 12px (`gutter`) entre les cartes de nœuds réseau ou les listes d'éléments synchronisés.
- **Évolution Desktop / Tablette :**
  - Tablette (>=768px) : 8 colonnes, marge extérieure de 24px, gouttières de 16px.
  - Desktop (>=1200px) : 12 colonnes avec largeur maximale contrainte à 1180px, marge latérale automatique centrée, gouttières de 20px.
- **Rythme vertical :**
  - Progression stricte par multiples de 4px (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 12px, `space-lg` = 16px, `space-xl` = 24px).
  - Les espacements entre sections fonctionnelles (ex. zone d'appairage vs historique du presse-papier) s'établissent à 24px sur mobile et s'étendent à 32px sur grand écran.

## Elevation & Depth

Le système abandonne les ombres portées classiques au profit d'un étagement de surfaces foncées et de halos atmosphériques directionnels.

- **Niveau 0 (Toile de fond) :** `#08090D` mat, servant de vide spatial neutre.
- **Niveau 1 (Surfaces de base) :** `#0F1117` bordé d'un contour discret de 1px en `#1E2230`. Aucune ombre diffuse pour les conteneurs passifs.
- **Niveau 2 (Surfaces en lévitation & survols) :** `#161923` rehaussé d'une bordure `#2A2F40`. Utilisé pour les modales de confirmation de transfert, les menus contextuels et les fiches d'appareils actifs.
- **Niveau 3 (Lueurs spectrales réactives) :**
  - *Liaison primaire active :* Halo diffus `0px 0px 40px -10px rgba(124, 92, 255, 0.40)`.
  - *Activité temps réel / Presse-papier :* Halo diffus `0px 0px 35px -8px rgba(0, 229, 204, 0.35)`.
  - *Alerte critique :* Halo diffus `0px 0px 30px -8px rgba(255, 91, 91, 0.35)`.
- **Composants flottants (Barres d'actions rapides, appels chiffrés) :** Utilisation d'un effet de verre fumé (`backdrop-filter: blur(16px)`) combiné à `#0F1117` à 80% d'opacité et liseré supérieur translucide blanc à 8% pour simuler une arête biseautée imperceptible.

## Shapes

La géométrie oscille entre des contours adoucis généreux et des capsules complètes ("pills"), évoquant des modules matériels autonomes et futuristes.

- **Conteneurs majeurs & Fiches d'appareils :** Rayon de courbure de 20px à 24px pour une sensation fluide, tactile et organique.
- **Cartes secondaires, panneaux d'entrée & bulles de transfert :** Rayon de 16px garantissant la cohésion interne des modules emboîtés.
- **Badges, commutateurs, boutons d'action rapide & barres d'état flottantes :** Forme pilule intégrale (rayon `9999px`) pour contraster avec la structure orthogonale de la grille.
- L'intégrité des angles est rigoureusement synchronisée : tout élément imbriqué conserve un rayon inférieur ou égal à celui de son conteneur parent pour éviter les décalages optiques.

## Components

### Boutons
- **Bouton Principal (Action de synchronisation / Appel) :** Fond `#7C5CFF`, texte `#F5F6FA` (Geist 500), arrondi pilule (`9999px`), padding horizontal 20px, hauteur 44px sur mobile. Au survol et état connecté, activation du halo `0 0 40px -10px rgba(124, 92, 255, 0.5)`.
- **Bouton Secondaire / Déconnexion :** Fond transparent, bordure 1px `#1E2230`, texte `#9096A6`. Au survol, bordure passe à `#2A2F40` et texte à `#F5F6FA`.
- **Bouton Destructif (Fin d'appel / Révocation) :** Fond teinté `#FF5B5B` à 12%, bordure 1px `#FF5B5B` à 40%, texte `#FF5B5B`.

### Badges & Puces (Chips)
- **Badge d'état d'appareil :** Forme pilule, fond `#161923`, liseré 1px `#1E2230`. Dot d'activité de 6px avec lueur pulsée (vert `#22E67E` si connecté, ambre `#FFB547` si en attente). Texte en `code-sm` JetBrains Mono.
- **Puce de protocole :** Forme pilule compacte, texte `label-caps`, teinté cyan `#00E5CC` à 10% avec contour `#00E5CC` à 30%.

### Cartes de Nœuds & Appareils (Device Cards)
- Fond `#0F1117`, rayon de courbure de 20px, bordure 1px `#1E2230`. 
- En-tête avec nom de l'appareil (`title-sm`), icône de catégorie (ordinateur portable, smartphone, serveur), et métadonnée d'empreinte chiffrée tronquée (`code-sm` en `#5A6172`).
- État actif : transition douce vers une bordure `#7C5CFF` avec déclenchement de la lueur violette d'arrière-plan.

### Listes de Transfert & Presse-papier
- Éléments séparés par un interstice de 8px (pas de filets de séparation continus, agencement en îlots).
- Chaque rangée adopte `#0F1117`, rayon de 16px, padding vertical 12px et horizontal 16px.
- Prévisualisation du type de contenu (texte copié, flux binaire, appel vocal) avec timestamp en `code-sm`.

### Champs de Saisie (Recherche & Clés d'appairage)
- Fond `#0F1117`, bordure 1px `#1E2230`, rayon de courbure de 16px, hauteur 48px. Texte en Geist 14px pour la recherche, JetBrains Mono 13px pour les clés privées ou jetons.
- Focus : bordure `#00E5CC` ou `#7C5CFF`, sans halo agressif extérieur, soulignée par un léger éclaircissement de la surface à `#161923`.

### Indicateurs de Sélection (Cases & Radios)
- **Interrupteurs (Switches de sync automatique) :** Largeur 44px, hauteur 24px, piste `#1E2230` basculant en `#7C5CFF` avec lueur violette subtile. Curseur blanc de 20px glissant en douceur.
- **Cases à cocher :** Carré de 18px aux angles adoucis de 6px, contour `#2A2F40`, remplissage `#7C5CFF` avec glyphe minimaliste blanc une fois cochée.

### Composant Métier Spécifique : Radar d'Appairage Spatial
- Anneaux concentriques pointillés dégradés en `#1E2230` avec balayage radial doux en `#00E5CC` à 8% d'opacité.
- Nœuds détectés représentés par des pastilles de 36px flottantes animées, reliées par des segments vectoriels ultra-fins signifiant le canal de négociation E2E en cours.