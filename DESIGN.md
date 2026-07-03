# DESIGN.md — YOOTOO Design Constitution

## Philosophie

YOOTOO est une application premium.

Chaque écran doit donner une impression de calme, de qualité et de confiance.

Nos références sont :

* Apple
* Airbnb
* Revolut
* Notion
* Mapbox

Jamais une interface chargée.

Toujours une interface qui respire.

---

# Design Principles

## Image first

L'image est l'élément principal.

Chaque commerce est présenté avant tout par sa photographie.

Le texte vient ensuite.

---

## Une seule voix

Toute l'application s'adresse à l'utilisateur en vouvoiement.

Jamais de tutoiement.

Le ton est :

* chaleureux
* positif
* sobre
* premium
* jamais technique

---

## Hiérarchie

Toujours :

Titre

↓

Information principale

↓

Informations secondaires

↓

Action

Jamais l'inverse.

---

# Espacements

Utiliser exclusivement les tokens.

Écran :

padding horizontal = spacing.lg

Sections :

gap = spacing.lg

Composants denses :

gap = spacing.sm

Ne jamais créer d'espacement arbitraire.

---

# Cartes

Toutes les cartes utilisent :

* radius = radii.xl
* shadow = shadows.sm
* border = colors.border

Les Hero Cards peuvent utiliser shadow.md.

Jamais d'autres valeurs.

---

# Boutons

Les boutons utilisent :

* radius = radii.lg
* padding du Design System
* couleurs du thème

Le CTA principal est toujours unique.

Éviter plusieurs boutons principaux sur un même écran.

---

# Images

Toutes les images passent par MerchantPhoto.

Règles :

* cachePolicy = memory-disk
* transition = 220 ms
* recyclingKey obligatoire

Priorité :

cover

↓

photo

↓

gallery

↓

placeholder YOOTOO

Jamais de placeholder technique.

---

# Typographie

Hiérarchie :

Display

↓

Title

↓

Subtitle

↓

Body

↓

Caption

Jamais deux tailles très proches pour deux niveaux différents.

---

# Ombres

Repos :

shadows.sm

Élévation :

shadows.md

CTA flottants :

shadows.lg

Ne jamais utiliser d'autres intensités.

---

# Coins

Cartes :

radii.xl

Boutons :

radii.lg

Images :

radii.xl

Badges :

radii.pill

---

# Carte

La carte est le cœur de YOOTOO.

Les marqueurs sont :

* photo ronde
* bord blanc
* ombre légère

La sélection est toujours :

* contour vert YOOTOO
* légère mise à l'échelle

Les clusters doivent rester sobres.

---

# Animations

Seulement :

Fade

Scale

Slide

Durée :

150–220 ms

Jamais d'animations décoratives.

---

# Performance

Chaque évolution doit préserver :

* FlatList virtualisée
* cache expo-image
* clustering Mapbox
* rendu GPU
* DOM minimal

La fluidité est prioritaire sur l'effet visuel.

---

# Accessibilité

Toutes les zones tactiles :

≥ 40 px

Tous les contrastes :

WCAG conformes

Tous les boutons :

accessibilityLabel

accessibilityRole

---

# Cohérence

Avant chaque Pull Request, vérifier :

* même langage
* mêmes rayons
* mêmes espacements
* mêmes ombres
* mêmes transitions
* même ton rédactionnel

Aucune exception sans justification.

---

# Règle d'or

Si une nouvelle interface ne semble pas avoir été dessinée par la même équipe que le reste de YOOTOO, elle doit être retravaillée avant d'être fusionnée.
