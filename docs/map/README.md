# YOOTOO Map System

> La carte doit **donner envie de sortir découvrir sa ville.**

Ce dossier est la **source de vérité** du système cartographique YOOTOO. Il doit survivre
plusieurs années : chaque évolution s'appuie dessus, chaque décision y est tracée.

On ne construit pas « une belle carte Mapbox ». On construit **la meilleure expérience
d'exploration locale** — une carte dont un utilisateur reconnaît une capture en une seconde,
sans voir le logo.

## Les trois couches (indépendantes)

| Couche | Rôle | Où, dans le code |
|---|---|---|
| **[Map Design System](./DESIGN-SYSTEM.md)** | *Quoi* : identité visuelle, cognitive, tokens, langage | `src/design/tokens/` + ce dossier |
| **[Map Engine](./ARCHITECTURE.md#map-engine)** | *Comment* : rendu carte, marqueurs, caméra, clustering | `src/features/map/`, `src/components/map/` |
| **[Discovery Engine](./ARCHITECTURE.md#discovery-engine)** | *Qui / quand* : quoi montrer, dans quel ordre, selon le contexte | `src/features/discovery/` |

Elles restent **découplées** : le Design System ne connaît pas Mapbox ; le Map Engine ne
connaît pas le ranking ; le Discovery Engine ne connaît ni Mapbox ni le DOM. Voir
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Le film de l'exploration

Ce que l'utilisateur **vit** dans les 30 premières secondes : **[FIRST_30_SECONDS.md](./FIRST_30_SECONDS.md)**
— référence produit. Toute feature future doit respecter cette mise en scène (identifier un commerce,
un lieu, une envie de sortir, une qualité, une confiance — sans avoir cherché).

## Marcher avec la carte

**[FIELD_OBSERVATION.md](./FIELD_OBSERVATION.md)** — protocole d'observation terrain (12 scénarios,
grille de notation, feuille de session). Phase d'observation : **on n'ajoute rien**, on marche, on
note. Toute future amélioration devra citer une ligne observée ici.

Le développement est **suspendu** : toute feature devra désormais citer une des **trois sources** —
observation terrain, [Journal des Moments YOOTOO](../product/YOOTOO_MOMENTS.md), ou test utilisateur.
Chaîne imposée : **observer → comprendre → décider → développer** (on ne saute plus d'étape).

## La règle absolue — le filtre de toute décision

Avant d'ajouter **quoi que ce soit** à la carte, la proposition passe ce filtre. Une seule
réponse « non » = on rejette ou on retravaille.

1. **Vision** — est-ce que ça renforce *« donner envie de sortir » ? (spectaculaire ≠ utile.)
2. **Cognition** — le cerveau comprend-il **sans lire** ? Est-ce plus **calme** qu'avant ?
   *(Règle d'or : chaque ajout doit permettre d'en retirer deux.)*
3. **Performance** — budget respecté ? (voir [Performances](./DESIGN-SYSTEM.md#performances).)
4. **Identité** — est-ce reconnaissable comme **YOOTOO** (pas Google/Apple/Mapbox/Airbnb) ?
5. **Évolutivité** — compatible avec les phases futures, sans dette ?

> On analyse les principes des autres (Google Maps = navigation, Apple Plans = beauté,
> Airbnb = découverte, Pokémon GO = exploration). On **ne copie jamais**. YOOTOO optimise
> **l'envie de sortir**.

## Décisions

Toute décision structurante est un **[ADR](./adr/README.md)** (Architecture Decision Record) :
contexte → décision → conséquences. On ne revient pas dessus sans un nouvel ADR.

## Statut des chapitres

| Chapitre | Statut |
|---|---|
| Vision · Philosophie · Principes | ✅ Défini |
| Langage des couleurs | ✅ **Implémenté** (tokens `mapMarkers.ts`) |
| États des marqueurs | ✅ **Implémenté** (Cartes Vivantes V2.1) |
| Animations · Accessibilité · Performances | ✅ Défini |
| Caméra | 🟢 [Camera Engine](./CAMERA.md) câblé (C2–C6) — toute la caméra passe par le Spatial Engine |
| Apparition éditoriale (zoom) | 🟡 Phase 5 — cadre + questions ouvertes |
| Terrain · Bâtiments 3D | 🟡 Phase 2 — cadre + questions ouvertes |
| Bottom Sheet premium | 🟡 cadre + cible |
| Vie contextuelle | 🟡 Phase 6 — cadre |

Les chapitres 🟡 sont **cadrés mais pas figés** : on documente les questions ouvertes, jamais
des specs inventées (une spec inventée = de la dette). Ils se remplissent à leur phase.
