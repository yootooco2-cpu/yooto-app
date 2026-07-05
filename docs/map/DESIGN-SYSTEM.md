# YOOTOO Map Design System

> On ne dessine pas des marqueurs. On dessine des **invitations à découvrir un lieu.**

---

## 1. Vision

La ville devient un **terrain d'exploration**. L'utilisateur ne doit jamais avoir l'impression de
regarder une base de données, mais une **ville vivante** : tout respire, tout invite, tout est calme,
tout donne envie de toucher la carte.

Positionnement (analyser, ne pas copier) :

| Produit | Optimise |
|---|---|
| Google Maps | la navigation |
| Apple Plans | la beauté |
| Uber | la prise en charge |
| Pokémon GO | l'exploration |
| Airbnb | la découverte |
| **YOOTOO** | **l'envie de sortir** |

## 2. Philosophie

- **La carte n'est pas le produit — les commerçants le sont.** Chaque décision graphique doit les
  rendre plus visibles, plus désirables, plus mémorables.
- **La photo est l'émotion, la couleur est l'information, l'anneau est le langage.**
- **Éditeur de désir** : deux personnes au même endroit ne voient pas exactement la même hiérarchie —
  la carte privilégie les découvertes les plus pertinentes pour chacune (moment, saison, marche, qualité).

## 3. Principes (les trois règles d'or)

1. **Réduire.** Chaque nouvel élément doit permettre d'en supprimer deux. La simplicité est un
   avantage concurrentiel. *Anti-« sapin de Noël » : si une idée ajoute du bruit, on la retire.*
2. **Guider.** La carte répond implicitement à *« Où ai-je envie d'aller maintenant ? »* — par la
   hiérarchie visuelle, le contexte et la mise en valeur, **jamais** par la surcharge.
3. **Valoriser les commerçants.** Plus visibles, plus désirables, plus mémorables.

Principes cognitifs appliqués :
- **Reconnaître sans lire** (couleur = catégorie, pré-attentif).
- **Une seule source de lumière** → réalisme ressenti sans être remarqué.
- **États rares et lisibles** (4 max) → mémorisation.

---

## 4. Langage des couleurs ✅ (implémenté)

La couleur du **cadre** d'un marqueur (anneau + halo) = sa **catégorie**. Objectif : reconnaître
une catégorie **sans lire**. Palette mémorisable, distincte, calme. Implémenté comme token unique :
`src/design/tokens/mapMarkers.ts` (`MAP_COLOR_LANGUAGE`, `mapColorFor`) — `photoMarkers` ne code
**aucune couleur en dur**. Le **badge cryptogramme** garde, lui, sa propre couleur d'identité
(deux rôles distincts → [ADR-006](./adr/README.md)).

| Catégorie | Teinte | Hex |
|---|---|---|
| Producteurs | vert sauge | `#7d9068` |
| Primeurs | vert feuille | `#4e8a3c` |
| Boulangeries | blé doré | `#c99a3e` |
| Cafés | espresso | `#5b4636` |
| Restaurants | terracotta | `#c0674a` |
| Cavistes | bordeaux | `#7e2e3c` |
| Fleuristes | rose botanique | `#c06a86` |
| Artisanat | cuivre | `#b06b3a` |
| Culture | bleu nuit | `#2f3a63` |
| Bien-être | lavande | `#8c7bb0` |

Les autres cryptogrammes suivent la même logique (teinte dédiée, distincte des voisines). La couleur
sert l'**anneau**, le **halo teinté** et le **badge cryptogramme**. → [ADR-005](./adr/README.md).

---

## 5. États des marqueurs ✅ (4 états — implémenté)

La **photo est le héros** (anneau = liseré fin). L'**anneau/aura raconte l'état**. Variations
**statiques**, fixées à la création — aucune animation permanente.

| État | Signification | Taille | Anneau / aura |
|---|---|---|---|
| **Standard** | commerce normal | 40 px | anneau simple fin (couleur catégorie) |
| **Recommandé** | mis en avant | 48 px | **double anneau** + halo large « d'air » (respire) |
| **Exceptionnel** | à ne pas manquer | 52 px | anneau catégorie fin + **aura OR/champagne** (précieux, **jamais rouge**) |
| **Sélectionné** | focus courant | 46 px | anneau **épais vert YOOTOO**, domine tout (z-index 6) + **pop au clic** |

Détails validés :
- **Halos teintés** par la catégorie (jamais blanc uniforme) → le marqueur se **fond** dans la carte.
- **Ombre directionnelle** cohérente (lumière haut-gauche) + ombre de contact (profondeur).
- **Photo « bleed »** jusqu'au bord + reflet de lumière discret → profondeur.
- **Badge cryptogramme** conservé (identité), estompé au très fort zoom.
- **Sélectionné = seul état à couleur fixe** (vert YOOTOO) ; **Exceptionnel = seule aura fixe** (or).

Chaîne implémentée (3 couches indépendantes) :
`markerState(merchant)` **pur** (Discovery, `editorial/markerState.ts`) décide l'importance
intrinsèque → l'adaptateur la porte sur le `MapMarker` → la feature GeoJSON → `markerVisualModel(state, cryptogramId, {selected})`
**pur** (Map Engine, `features/map/markerVisualModel.ts`) la traduit en pixels depuis les tokens →
`photoMarkers` **applique** (aucune décision au rendu).

Règles `markerState` — bandées par le **score éditorial** (source unique, ADR-003 · [ADR-011](./adr/README.md)) :
hors-mission (`veryLow`/`low`) ou **sans vraie photo** → jamais promu (`Standard`) ; sinon
`Exceptionnel` = score ≥ `GOLD_SCORE`, `Recommandé` = score ≥ `RECOMMENDED_SCORE`, sinon `Standard`.
`Sélectionné` est un **focus transitoire** appliqué au rendu (pas un état éditorial), avec **pop
one-shot** au clic. *(Contextuel en Phase 6 : marché du samedi, etc.)*

**L'OR est RARE — c'est une distinction éditoriale, pas une récompense algorithmique.** Il signifie :
*« s'il fallait vous faire découvrir UN seul lieu aujourd'hui, ce serait probablement celui-ci ».*
La **rareté fait sa valeur** — sa couronne n'apparaît que pour la plus haute confiance de YOOTOO.

Distribution réelle (audit corpus Montpellier, 676 commerces — 2026-07) : seuils calés pour
**or ≈ 2,8 % · recommandé ≈ 15 % · standard ≈ 82 %** (un fond calme qui laisse les héros ressortir).
*Avant calibrage, l'or touchait 36,5 % des commerces — la couronne ne distinguait plus rien.*

> **Observation à traiter plus tard (non résolue ici) :** trié par score pur, le haut du classement
> est monopolisé par les **domaines viticoles** (bonus producteur cumulés). L'or « toutes catégories »
> demanderait une **diversité éditoriale** (dé-doublonnage par famille sur l'écran) — chantier
> Discovery distinct, à décider depuis le terrain, pas ici.

Référence visuelle : proxy de calibration V2.1 (living-markers).

---

## 6. Animations ✅

**Aucune animation gratuite. Chaque animation informe.** Jamais permanente.

| Animation | Quand | Détail |
|---|---|---|
| **Pop de sélection** | au **clic** uniquement | scale 100 → 105 → 100 %, ~200 ms, courbe douce, **une fois** |
| **Fondu d'apparition** | marqueur qui entre | opacité 0 → 1 (existant `photoMarkers`) — deviendra **éditorial** en Phase 5 |
| Transition d'anneau/halo | changement d'état | 120 ms, `border-color`/`box-shadow` uniquement |

Contrainte : le pop s'anime sur un **élément interne** (`.photo`), **jamais** sur le marqueur
Mapbox (qui possède le `transform`). `prefers-reduced-motion` désactive tout mouvement.

---

## 7. Accessibilité

- **Contraste** : anneaux et halos calibrés clair **et** sombre ; le texte des fiches suit les tokens.
- **Mouvement** : `prefers-reduced-motion: reduce` → pas de pop, pas de fondu.
- **Focus clavier** : états focus visibles sur les contrôles (FABs, fiche).
- **Cibles tactiles** : marqueur ≥ 40 px (ok mobile) ; `hitSlop` sur les petits boutons.
- **La couleur n'est jamais seule** : catégorie = couleur **+** cryptogramme (badge) ; état =
  anneau **+** taille (pas seulement la teinte).

---

## 8. Performances

Budget = **fluidité au pan/zoom** avant tout. Décisions structurantes :

- **Pool borné** de marqueurs photo (`POOL_MAX = 140`) ; le reste est porté par les **couches GL**
  (clusters) → le DOM ne contient jamais des milliers de marqueurs.
- **Jamais de `transform`** sur un marqueur (position Mapbox) → mise en avant via anneau/halo/taille/z-index.
- **Styles statiques** (box-shadow) plutôt qu'animations continues → 0 churn au scroll.
- **`ResizeObserver` → `map.resize()`** (déjà en place) : carte jamais tronquée (split Focus desktop).
- **Fetch-once** du corpus + filtrage/tri **en mémoire** (aucune requête à la frappe).
- Règle : toute nouvelle couche doit prouver un **coût nul ou négatif** au frame budget, sinon elle
  est retravaillée.

---

## 9. Chapitres cadrés (à figer à leur phase — pas de spec inventée)

### Caméra 🟠 Phase 4 — architecture proposée
Caméra **invisible** (guide silencieux). Architecture complète : **[CAMERA.md](./CAMERA.md)** —
pipeline `Context → Intent → Strategy → Scheduler → Adapter` (la logique métier n'appelle jamais
Mapbox), 6 niveaux de zoom, règles de pitch, machine à états, tokens, plan d'implémentation en
petites PR. → [ADR-007](./adr/README.md). *À valider avant tout code.*
*Questions ouvertes* : source du « type de quartier » (modificateur territoire) ; valeurs à calibrer
sur la vraie carte ; padding sheet-aware exact.

### Apparition éditoriale au zoom 🟡 Phase 5 — **la signature**
Au zoom, les commerces **ne surgissent pas tous ensemble** : ils apparaissent dans l'**ordre
éditorial** (marché → meilleur boulanger → meilleur café → meilleur producteur → puis le reste). « La
ville révèle ses meilleures adresses. »
*Hook posé* : le marqueur porte déjà son **rang éditorial** (via `rankMerchantsEditorially`). Reste à
définir la cadence de révélation et le lien zoom ↔ densité.

### Terrain & Bâtiments 3D 🟡 Phase 2
2D à faible zoom → léger relief → `fill-extrusion` 3D **douce** (architecturale, pas des cubes Google).
Mise en valeur **très discrète** des repères (mairie, cathédrale, château, marché couvert).
*Questions ouvertes* : perf de l'extrusion sur mobile-web ; jeu de données bâtiments ; seuils de zoom.

### Bottom Sheet premium 🟡
Existant : `@gorhom/bottom-sheet`, 3 paliers, mini-fiche `MapMerchantPreview`. Cible : **synchronisé
avec la carte** (le sheet monte, la caméra descend, le commerce grossit, le reste s'efface) — tout
informe, tout est synchronisé.

### Vie contextuelle 🟡 Phase 6
Le **style ne change pas**, l'**importance** évolue : `markerState(merchant, ctx)` s'appuie sur les
signaux **temps/saison** déjà présents (`timeSignals`, `seasonOf`) — marché du samedi matin, café du
matin, producteur en saison, ouverture du jour.
