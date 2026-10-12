---
name: Invisible Bridge Spatial System
colors:
  surface: '#111319'
  surface-dim: '#111319'
  surface-bright: '#373940'
  surface-container-lowest: '#0c0e14'
  surface-container-low: '#191b22'
  surface-container: '#1e1f26'
  surface-container-high: '#282a30'
  surface-container-highest: '#33343b'
  on-surface: '#e2e2eb'
  on-surface-variant: '#c9c4d8'
  inverse-surface: '#e2e2eb'
  inverse-on-surface: '#2e3037'
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
  tertiary: '#cabeff'
  on-tertiary: '#310f90'
  tertiary-container: '#937ff7'
  on-tertiary-container: '#2a0088'
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
  tertiary-fixed: '#e6deff'
  tertiary-fixed-dim: '#cabeff'
  on-tertiary-fixed: '#1c0062'
  on-tertiary-fixed-variant: '#4830a6'
  background: '#111319'
  on-background: '#e2e2eb'
  surface-variant: '#33343b'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies the concept of "the invisible bridge between your devices"—silent, instantaneous, and pervasive. It is engineered for technically discerning users who demand continuous state synchronization across desktop, tablet, and mobile environments without visual noise.

Drawing direct inspiration from toolmakers like Linear, Raycast, Arc Browser, and Vercel, the aesthetic relies on **Technical Spatial Minimalism**:
- **Atmospheric Dark Canvas**: Surfaces recede into deep cosmic blue-blacks rather than flat voids. Never deploy pure `#000000` or stark `#FFFFFF`.
- **Ethereal Spatial Depth**: Optical depth is achieved through translucent planes, hairline luminous strokes, and focused directional luminescence rather than heavy drop shadows.
- **Micro-Precision Interaction**: Crisp typography, high-density telemetry data, and immediate tactile feedback. Components feel weightless yet structurally bounded.
- **Localized Polish**: The interface communicates natively in French, demanding thoughtful typographic metrics for accented glyphs and longer phrasing while maintaining dense, elegant proportions.

## Colors

The palette is tuned for high-contrast legibility against low-luminance substrates, prioritizing functional hierarchy and subtle ambient glows.

### Foundational Palette
- **Canvas / Root Background**: `#08090D` — Cold obsidian tinted with cosmic blue.
- **Surface**: `#0F1117` — Primary substrate for cards, sidebars, and grouped containers.
- **Surface Raised**: `#161923` — Floating layer for command palettes, sheets, popovers, and contextual modals.
- **Border Subtle**: `#1E2230` — Receded grid lines, inner separators, and inactive container frames.
- **Border Strong**: `#2A2F40` — Elevated container perimeters, interactive control borders, and active strokes.

### Spectral & Accent Accents
- **Primary (Electric Violet)**: `#7C5CFF` — Primary triggers, synchronization beams, active node states.
- **Primary Glow**: `#9B87FF` — Hover illumination and spatial radial reflections (`rgba(124, 92, 255, 0.4)`).
- **Secondary / Accent (Mint Cyan)**: `#00E5CC` — Device handshakes, active mesh bridges, and peer-to-peer data transfers.
- **Success (Neon Green)**: `#22E67E` — Validated cryptographic hashes, connected states.
- **Warning (Amber)**: `#FFB547` — Transfer throttles, local uncommitted states.
- **Danger (Coral Red)**: `#FF5B5B` — Revoked keys, disconnected peers, merge collisions.

### Typography & Content Shades
- **Text Primary**: `#F5F6FA` — Primary readability tier; soft off-white resisting eye fatigue.
- **Text Secondary**: `#9096A6` — Secondary metadata, timestamps, protocol statuses.
- **Text Muted**: `#5A6172` — De-emphasized labels, disabled states, shortcut hints.

## Typography

The typographic hierarchy balances structural engineering clarity with editorial polish:
- **Headings (Geist)**: Rendered in Semi-Bold (600) with tightened letter tracking to produce a disciplined, technical silhouette. Headings convey momentum and decisive authority.
- **Body Text (Inter)**: Rendered in Regular (400) with neutral geometry, guaranteeing sustained reading comfort across dense multi-column dashboards and logs.
- **Monospaced Telemetry (JetBrains Mono)**: Applied to device UUIDs, network throughput metrics, cryptographic key fingerprints, and interface shortcuts (`kbd`).

### Localization Rules (French UI)
- Maintain negative letter-spacing cautiously on display sizes to accommodate capital diacritics (`É`, `À`, `È`).
- Reserve 15–20% additional horizontal flow capacity across navigation ribbons and compact buttons to prevent truncation of French technical strings (e.g., `Connecter l'appareil`, `Synchronisation chiffrée`, `Paramètres de passerelle`).

## Layout & Spacing

The layout operates on a dynamic mathematical grid designed to translate fluidly between expansive ultra-wide desktop monitors and high-density mobile viewports (baseline viewport: **375px × 812px**).

### Spatial Architecture
- **Desktop / Tablet**: 12-column variable grid, bounded by a maximum canvas of `1440px`. Gutter spans `1rem` (16px) with an outer margin of `2rem` (32px).
- **Mobile (375x812px)**: Single-column flow with a strict `1rem` (16px) margin. Elements scale down internal padding, collapsing auxiliary sidebar panes into floating bottom sheets or spatial drawer layers.
- **Spacing Rhythm**: Governed strictly by a 4px/8px modular scale (`0.25rem` to `2.5rem`). Stacked items use explicit spacing gaps; never rely on implicit margin collapse.
- **Vertical Safe Regions**: Mobile views enforce a top notch clearance of `44px` and home indicator clearance of `34px`, anchoring critical bridge actions within primary thumb arcs.

## Elevation & Depth

Spatial depth is rendered via layered illumination, luminous hairline borders, and backdrop diffusions rather than muddy drop shadows.

### Atmospheric Tiers
1. **L0 (Substrate - `#08090D`)**: The primary window background. Recedes infinitely into the deep spectrum.
2. **L1 (Cards / Panels - `#0F1117`)**: Bounded by hairline borders (`1px solid #2A2F40`). Utilizes backdrop blurs (`backdrop-filter: blur(16px)`) when overlaid on active visualization nodes.
3. **L2 (Modals / Floating HUDs - `#161923`)**: Layered directly above L1. Uses dual edge treatments: a 1px border of `#2A2F40` complemented by an inner top highlight of `1px solid rgba(245, 246, 250, 0.06)` to simulate overhead ambient illumination.

### Luminous Glow Model
- **Sync Beam Focus**: Interactive cards and active peer conduits emit a directional, low-frequency halo: `box-shadow: 0 0 24px -4px rgba(124, 92, 255, 0.4)`.
- **Node Connected Pulse**: Active bridge nodes introduce a mint-tinted aura: `box-shadow: 0 0 16px -2px rgba(0, 229, 204, 0.35)`.
- Shadows are strictly color-tinted; black shadows (`rgba(0,0,0,...)`) are forbidden on floating interactive modules to avoid flattening the luminous aesthetic.

## Shapes

The geometric signature is smooth, continuous, and ergonomically sculpted. Surfaces reject needle-sharp corners in favor of deep continuous radiuses, echoing modern hardware chassis:

- **Compact Controls (Buttons, Inputs, Badges)**: Bounded by `16px` radius (`rounded-md`).
- **Medium Structural Units (Standard Cards, Flyouts, Drawers)**: Bounded by `20px` radius (`rounded-lg`).
- **Large Panels & Context Modals**: Bounded by `24px` radius (`rounded-xl`).
- **Interactive Badges, Tokens & Status Pills**: Rendered as continuous full-radius capsules (`9999px` / `rounded-full`).

## Components

### Buttons
- **Primary**: Background `#7C5CFF`, text `#F5F6FA`, radius `9999px` (pill) or `16px`. On hover: background `#9B87FF` with `box-shadow: 0 0 20px rgba(124, 92, 255, 0.45)`. Focus ring: `2px solid #00E5CC`.
- **Secondary / Ghost**: Background `transparent`, border `1px solid #1E2230`, text `#F5F6FA`. On hover: background `#161923`, border `#2A2F40`.
- **Destructive**: Background `transparent`, border `1px solid rgba(255, 91, 91, 0.3)`, text `#FF5B5B`. On hover: background `rgba(255, 91, 91, 0.1)`.

### Form Inputs & Text Fields
- Substrate `#0F1117`, border `1px solid #1E2230`, radius `16px`, typography `Inter body-md`. Text `#F5F6FA`, placeholder `#5A6172`.
- Focus state: border `#7C5CFF`, box-shadow `0 0 0 1px #7C5CFF, 0 0 12px rgba(124, 92, 255, 0.25)`.
- Error state: border `#FF5B5B`, box-shadow `0 0 12px rgba(255, 91, 91, 0.2)`.

### Cards & Grouped Containers
- Background `#0F1117`, border `1px solid #2A2F40`, radius `20px`, padding `1.5rem` (`space-lg`).
- In active sync states, card borders transition dynamically to a primary glow linear gradient or reveal a subtle pulsating beacon in the top right corner.

### Chips & Badges
- Pill geometry (`9999px`), padding `0.25rem 0.75rem`.
- Active Bridge: Background `rgba(0, 229, 204, 0.1)`, border `1px solid rgba(0, 229, 204, 0.3)`, text `#00E5CC`, font `JetBrains Mono label-caps`.
- Disconnected: Background `rgba(90, 97, 114, 0.15)`, border `1px solid #1E2230`, text `#9096A6`.

### Lists & Row Items
- Background transparent with a bottom border of `1px solid #1E2230`. Hover state triggers a sweep of `#161923` across the row with an eased `120ms` cubic bezier transition.
- Leading slot houses device-specific indicators (Mac, iPhone, iPad, Linux terminal); trailing slot retains monospaced metadata and synchronization metrics.

### Checkboxes, Switches & Radio Controls
- Switch Track: 44px × 24px, background `#1E2230`, radius `9999px`.
- Active Thumb: 20px circle, background `#F5F6FA`. When active, track transitions to `#7C5CFF` accompanied by a localized violet glow.

### Specialized Bridge Components
- **Device Mesh Node**: Interactive radial card depicting peer devices with live latency ping (e.g., `4ms • Chiffré de bout en bout`).
- **Telemetry HUD**: Monospaced throughput counter (`JetBrains Mono`) paired with a micro-sparkline graph rendered in `#00E5CC`.
- **Command Palette (`Raycast-style`)**: Floated surface `#161923` with `24px` radius, `1px solid #2A2F40`, displaying instantaneous search and localized actions (e.g., `Synchroniser le presse-papiers`, `Transférer le fichier`).