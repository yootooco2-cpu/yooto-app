# Référence de Direction Artistique — la carte immersive YOOTOO

> **Référence officielle** : `docs/map/assets/da-reference-2026-07.png`. Elle guide la reconstruction
> de la carte. **Ce n'est pas une maquette à copier pixel par pixel** — c'est une cible de
> **sensations** : immersion · premium · lisibilité · élégance · réalisme ressenti · émotion · waouh.

---

## 0. Vérité de cadrage (à lire avant tout)

L'image de référence est un **rendu 3D photoréaliste** (moteur offline / génératif) : toits en tuiles
réelles texturées, illumination globale, profondeur de champ, grain cinématographique, cohésion
« film ». **Mapbox GL JS ne reproduit pas cela pixel pour pixel** — ce n'est pas un défaut de notre
part, c'est la frontière d'un moteur temps réel WebGL vs un rendu offline.

Notre objectif n'est donc **pas** la copie, mais l'atteinte d'un **niveau de qualité perçue
équivalent** avec les capacités réelles de GL JS (v3). Tout ce document distingue rigoureusement :
*ce qui est faisable · ce qui est simulable · ce qui est impossible · les compromis*.

### ⚠️ La tension stratégique n°1 (décision à prendre)
La référence pousse vers une carte **immersive, réaliste, 3D, « waouh »**.
Le style **S1** (verrouillé) poussait vers l'inverse : un **papier plat, calme, qui recule** pour que
les marqueurs soient les seuls héros (ADR-010). **Ces deux caps sont partiellement opposés.**

Ce qui reste **commun** (et non négociable) : les commerces sont les héros · lisibilité · une seule
lumière · l'or rare · le quartier comme repère. Ce qui **change** : le traitement du fond
(recule-plat **vs** immersif-3D-réaliste).

→ **Décision requise (Phase R0)** avant toute implémentation : voir §6.

---

## 1. Analyse (Creative Director · Staff Product Designer · expert Mapbox)

### Composition générale
Layout de **keyframe produit** (desktop immersif) : rail gauche (marque + vision + « en un coup
d'œil »), **scène carte centrale plein cadre** (le héros), fiche commerce flottante en surimpression
gauche, bandeau « Recommandés » en bas de scène, colonne de call-outs marketing à droite, et une
**bande de features** en pied (apparition éditoriale, lumière & saisons, bâtiments 3D, infos
contextuelles, récompenses, mode pro). La carte occupe ~60 % de la surface : **elle EST le produit**.

### Hiérarchie visuelle
1. Le **marqueur or sélectionné** (Le Pain d'Émilie) + son anneau au sol + le trajet piéton « 2 min »
   → point focal absolu. 2. Les autres **marqueurs vivants** (couleur = catégorie). 3. La **fiche**
   commerce. 4. La **ville 3D** (décor riche mais subordonné). 5. Le **chrome** (recherche,
   catégories, panneaux). L'œil va au commerce, puis à la ville — jamais l'inverse. ✔ conforme à notre doctrine.

### Proportions
Bâtiments à échelle **crédible** (R+2 à R+5, centre historique), rues étroites, place centrale
respirante, fleuve (le Lez) qui structure la droite avec ses ponts. Marqueurs **surdimensionnés
volontairement** vs bâtiments (lisibilité > réalisme d'échelle). Fiche ~22 % de largeur.

### Couleurs / palette
Toits **terracotta** chauds dominants, pierres crème/sable, végétation vert **doux et varié**, eau
**bleu-vert désaturé** (pas piscine), ciel/atmosphère chaud en fond. Marqueurs = **langage
catégoriel** vif (boulangerie ambre, café brun, producteur vert, resto, favori rouge, vin violet) +
**or** pour l'exceptionnel. Chrome **sombre** (verre dépoli anthracite) qui fait ressortir la scène.
→ très proche de notre famille chaude ; le chrome sombre est **nouveau** vs notre UI claire.

### Contrastes
Fort contraste **chrome sombre ↔ scène lumineuse** ; à l'intérieur de la scène, contrastes **doux**
(cohésion « heure dorée »). Les marqueurs **cassent** ce calme par saturation + halo → pop pré-attentif. ✔

### Ombres
**Ombres portées directionnelles douces** (soleil bas d'après-midi, ~haut-gauche/oblique),
+ **occlusion ambiante** dans les rues et à la base des bâtiments → sensation de volume et de
« vraie ville ». C'est un **levier premium majeur**.

### Lumière
**Heure dorée** cohérente sur toute la scène (une seule source, chaude, rasante). Halo doux global.
La lumière **raconte l'heure** (repris dans la feature « Lumière & saisons » : matin/après-midi/soir/nuit).

### Profondeur
**Profondeur de champ** (avant-plan et bords légèrement flous), **brume atmosphérique** au loin,
étagement net premier plan → fond. Donne l'immersion « maquette vivante vue d'un drone ».

### Matériaux / réalisme / niveau de détail
Toits tuilés, verrières, stores, arbres feuillus, quais, ponts, pavés, terrasses peuplées de
silhouettes. **Réalisme élevé mais stylisé** (pas hyperréaliste froid) — chaleureux, « habité ».
Densité de détail **très haute** — c'est ce qui crée le waouh **et** ce que GL JS ne fournit pas nativement.

### Bâtiments 3D
Volumes **texturés** (toits, façades), silhouettes variées, quelques **repères** (une église/cathédrale
centrale, bâti civique). Ombres + AO. → cœur du « waouh ». GL JS fait de la **3D extrudée à plat**
(couleur + lumière + ombres/AO), **pas** des toits photo-texturés.

### Végétation
Arbres **3D volumétriques** (couronnes), alignements, un square. → GL JS peut poser des **modèles 3D
d'arbres** (glTF) ou utiliser les arbres du style Standard ; pas la richesse du rendu offline.

### Routes / eau / textures
Routes **discrètes**, chaudes, sans casing (✔ aligné S1). **Eau** avec **reflets** doux et quais
détaillés → GL JS : eau plate colorée (+ éventuel léger effet), **pas** de reflets réalistes natifs.
Textures de sol (pavés) : non natives.

### Caméra / angle / pitch / zoom / densité
Caméra **oblique aérienne** (~**50–60° de pitch**), **zoom quartier** (~16–17), léger tele. Densité
d'information **maîtrisée** : beaucoup de détail 3D, mais peu de **texte** ; l'info vit dans les
**marqueurs** et la **fiche**. ✔ notre doctrine (informer sans remplir).

### Marqueurs
**Pins en goutte** premium : pastille colorée + **icône catégorie** blanche + **badge note** (4,9) ;
le sélectionné = **or** avec **anneau lumineux au sol** + **trajet piéton pointillé** + **temps** («2 min»)
+ **avatar utilisateur** à l'arrivée. → plus riche que nos pastilles photo rondes actuelles (V2.1).
Deltas : forme (goutte vs rond photo), badge note, anneau-sol, trajet, avatar.

### Animations implicites
Anneau or **pulsé**, trajet qui se **dessine**, apparition **progressive** des marqueurs (feature
« apparition éditoriale »), lumière qui **évolue** (saisons/heure), caméra qui **accompagne**. → tout
cela est **notre Camera/Discovery/markers** déjà pensés ; le rendu 3D non.

### Lisibilité · premium · immersion
Lisibilité **excellente** (contraste chrome/scène, marqueurs saillants, texte rare). **Premium** =
lumière + ombres + verre dépoli + typographie soignée. **Immersion** = 3D + profondeur + heure dorée.
Ce trio (**lumière/ombre/profondeur**) est le vrai secret du waouh — et **c'est en partie atteignable**.

---

## 2. Audit vs implémentation Mapbox actuelle (S1)

### 1) ✅ Déjà conforme
- Langage **catégoriel** de couleur + **or rare** + marqueurs héros (V2.1, ADR-005/011).
- **Une seule lumière** (déjà posée sur nos extrusions) ; ombre directionnelle des marqueurs.
- **Bâtiments 3D** en extrusion native (S1 couche 3) ; hauteurs réelles ×0,8.
- **Routes chaudes sans casing**, eau-repère désaturée, végétation désaturée, labels hiérarchisés (S1).
- **Caméra** oblique + pitch contextuel (Camera Engine câblé) ; **fiche** (Bottom Sheet) ; recherche ; catégories.
- **Apparition éditoriale** conçue (Phase 5) ; **lumière contextuelle** conçue (jour/nuit).

### 2) ❌ Manquant (mais faisable — voir §3)
- **Lumière réaliste v3** (ambient + directional chaud) au lieu de notre `light` simple.
- **Ombres dynamiques + occlusion ambiante** sur les bâtiments (le plus gros gain de « premium »).
- **Ciel / atmosphère / brume** (profondeur au loin) — `sky` + `fog`.
- **Végétation 3D** (modèles d'arbres) ; **quelques repères** (modèles de monuments).
- **Marqueurs premium** : anneau-sol du sélectionné, **trajet piéton** au sol, temps de marche, avatar.
- **Chrome sombre** (verre dépoli) qui fait ressortir la scène.
- **Ouverture cinématographique** par défaut (pitch/zoom quartier) + heure dorée.

### 3) ⛔ Impossible avec Mapbox GL JS (frontière du moteur)
- **Illumination globale / path tracing** (le rendu « film » de la référence).
- **Profondeur de champ** vraie (bokeh natif) — le pipeline GL JS n'expose pas de post-process DoF.
- **Toits photo-texturés par bâtiment** à l'échelle ville (les extrusions sont à plat ; texturer =
  modèles glTF par bâtiment = irréaliste city-wide).
- **Reflets d'eau réalistes**, **textures de pavés** au sol, **silhouettes de foule** animées.
- La **cohésion picturale** globale d'un rendu offline.

### 4) 🟢 Réalisable avec notre stack (GL JS v3 + React)
- v3 **`lights`** (ambient+directional), **ombres** (`*-cast-shadows`), **AO** de sol
  (`fill-extrusion-ambient-occlusion-*`), **emissive strength**, **`sky`/`fog`/atmosphere**.
- **Modèles 3D** via le type de couche `model`/`batched-model` (glTF) : arbres, quelques monuments.
- **Marqueurs** enrichis (HTML/CSS déjà maîtrisé) + **couches** `line` (trajet) et `circle`/custom
  (anneau-sol) + **avatar** (marqueur user existant).
- **Caméra** cinématique (Camera Engine) : pose d'ouverture oblique, pitch quartier.
- **Chrome sombre** (React, tokens) — pur UI.
- **Heure/saisons** : bascule de lumière (`lightPreset` Standard **ou** interpolation de nos `lights`).

### 5) 🎨 Nécessite des **assets personnalisés**
- Jeu d'**icônes de catégorie** (SDF/sprite) pour les pins premium + badges de note.
- **Overlay** de finition (vignette/halo/brume douce) — image légère.
- Éventuel **normal/roughness** subtil pour donner du grain aux toits (impact faible, coût élevé → optionnel).

### 6) 🧊 Nécessite des **modèles 3D** (glTF)
- **Arbres** (2–3 variantes LOD, légers) pour la végétation volumétrique.
- **Repères** : Cathédrale Saint-Pierre, Arc de Triomphe, Place de la Comédie (fontaine), Gare —
  quelques modèles curatés (orientation, pas tourisme). *Alternative* : les **3D landmarks** de Mapbox
  Standard (certains monuments déjà modélisés).

### 7) 🌈 Nécessite des **shaders / effets spécifiques**
- **DoF / bloom / grain** = **non supportés** nativement → **compromis** en **overlay CSS/canvas**
  (vignette + flou de bords léger + halo), jamais un vrai post-process 3D.
- **Custom layer** WebGL (raw) possible mais **lourd/risqué** (dette, perf mobile) → à éviter sauf ROI prouvé terrain.

### 8) Compromis assumés
- Toits **stylisés chauds + ombres/AO** au lieu de tuiles photo → on vise le **ressenti** de relief, pas la texture.
- **Brume/atmosphère + vignette** pour simuler la profondeur de champ.
- Reflets d'eau → **eau désaturée + léger dégradé/atmosphère**, pas de réflexion réelle.
- Repères **curatés en petit nombre** (pas toute la ville modélisée).
- **Perf mobile** = garde-fou permanent : ombres/AO/modèles ont un coût GPU → chaque phase mesure le budget.

---

## 3. La vérité perçue : d'où vient le « waouh » (et ce qu'on peut vraiment capter)

| Ingrédient du waouh | Poids ressenti | Atteignable GL JS ? |
|---|---|---|
| **Lumière chaude cohérente (heure dorée)** | ★★★★★ | ✅ oui (v3 lights / lightPreset) |
| **Ombres douces + occlusion ambiante** | ★★★★★ | ✅ oui (v3 shadows + AO) |
| **Profondeur (brume, étagement)** | ★★★★☆ | ✅ oui (sky/fog) — DoF simulé |
| **Volumes 3D + repères** | ★★★★☆ | ✅ oui (extrusion + modèles) |
| **Végétation 3D** | ★★★☆☆ | ✅ oui (modèles/Standard) |
| **Marqueurs vivants premium** | ★★★★★ | ✅ oui (déjà notre force) |
| **Toits photo-texturés / GI / DoF réel** | ★★★☆☆ | ⛔ non (compromis) |

**Conclusion d'expert :** ~**80 % de la sensation** de la référence tient à **lumière + ombre +
profondeur + volumes + marqueurs** — tout cela est **atteignable**. Les 20 % restants (rendu photo
pur) sont impossibles et **ne sont pas** ce qui fait l'émotion ; on les **simule** ou on les **assume**.

---

## 4. Feuille de route technique priorisée

Chaque phase : **indépendante · testable · réversible · application fonctionnelle à chaque étape**.
Le levier est trié par **ratio sensation / effort / risque**. (Aucune n'est lancée sans validation.)

| Phase | Contenu | Sensation | Effort | Risque perf | Réversible |
|---|---|---|---|---|---|
| **R0 — Décision de cap** | trancher §6 (immersif-3D vs S1-plat, ou hybride) | — | — | — | — |
| **R1 — Lumière & atmosphère** | v3 `lights` chaud + `sky`/`fog` sur l'extrusion existante | ★★★★★ | faible | faible | oui (revert style) |
| **R2 — Ombres & AO** | ombres dynamiques + occlusion ambiante bâtiments | ★★★★★ | moyen | **moyen** (mesurer mobile) | oui |
| **R3 — Ouverture cinématique** | pose caméra oblique par défaut (pitch quartier) via Camera Engine | ★★★★☆ | faible | faible | oui |
| **R4 — Marqueurs premium** | anneau-sol du sélectionné + trajet piéton + temps de marche + avatar | ★★★★★ | moyen | faible | oui |
| **R5 — Végétation & repères 3D** | modèles glTF arbres + 3–5 monuments curatés (ou Standard landmarks) | ★★★★☆ | **élevé** (assets) | **élevé** | oui |
| **R6 — Heure & saisons** | bascule de lumière jour/nuit (timeSignals) + apparition éditoriale (Phase 5) | ★★★★☆ | moyen | faible | oui |
| **R7 — Finitions perçues** | vignette/brume douce (overlay), halos, micro-anim, chrome sombre | ★★★☆☆ | moyen | faible | oui |

**Séquence recommandée** : R0 → **R1 → R2 → R3** (le trio lumière/ombre/caméra donne l'essentiel du
waouh, à faible risque) → R4 (marqueurs) → R6 → R7 → **R5 en dernier** (le plus coûteux/risqué : assets 3D).

Chaque phase = un artefact style/asset versionné + une **capture-laboratoire** + une **validation terrain**
(le vrai juge : lumière au soleil, fluidité mobile, waouh à l'ouverture).

---

## 5. Critères de succès (sensations, pas pixels)

À la fin, à l'ouverture, l'utilisateur doit ressentir : **immersion** (« je survole ma ville »),
**premium** (lumière/ombre soignées), **lisibilité** (les commerces sautent aux yeux), **élégance**
(rien ne crie), **réalisme ressenti** (volumes crédibles), **émotion**, **waouh** — puis, quelques
secondes après : *« tiens, je vais aller voir ce commerce ».* Le succès n'est **pas** « c'est
identique à l'image » ; c'est *« je ne savais pas qu'une carte web pouvait donner ça envie ».*

---

## 6. Décision de cap à trancher (R0) — avant toute implémentation

| Option | Ce que c'est | Pour | Contre |
|---|---|---|---|
| **A — Hybride S1 + réalisme v3** *(recommandé)* | garder notre style/identité S1 (proprio) + ajouter lumière/ombres/AO/atmosphère/modèles v3 | garde l'identité YOOTOO **et** gagne l'immersion ; réversible ; par phases | plus de travail que basculer sur Standard |
| **B — Base Mapbox Standard v3** | repartir du style Standard (lumière/ombres/AO/3D/landmarks intégrés) | le plus rapide vers le « waouh » réaliste | **reconnaissable** (contre ADR-010 : « pas un thème Mapbox ») ; moins proprio |
| **C — Rester S1 plat** | ne pas suivre la référence immersive | cohérent avec le verrou actuel | n'atteint pas le waouh de la référence |

Mon avis d'expert : **A (hybride)** — on greffe le réalisme (lumière/ombre/profondeur = 80 % du
ressenti) **sur notre identité**, par phases indépendantes, sans jeter S1 ni copier l'image. La 3D
photo (toits texturés, GI, DoF) reste hors de portée : on la **simule** ou on l'**assume**, sans mentir.

> **Rien n'est implémenté.** Ce document + cette feuille de route attendent ta décision de cap (R0).
