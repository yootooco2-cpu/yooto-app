# Constitution artistique de la carte YOOTOO

> **La véritable référence de S1 n'est pas le JSON Mapbox — c'est cette constitution.**
> Le style technique n'est qu'une *implémentation*. Ce document est la **loi fondamentale** :
> toute décision (aujourd'hui et dans cinq ans) doit pouvoir se justifier ici.

> North Star : l'[image de référence DA](./assets/da-reference-2026-07.png). On ne la copie pas —
> on comprend **pourquoi elle émeut**, et on reproduit **cette émotion avec notre propre identité.**

---

## Préambule — ce que la carte doit faire

La carte YOOTOO n'existe pas pour montrer une ville. Elle existe pour **donner envie de sortir la
vivre.** Tout ce qui sert cette envie est légitime ; tout ce qui la dilue est du bruit. La technologie
doit **disparaître** : l'utilisateur ne doit jamais penser « quelle carte », seulement « où j'ai envie
d'aller ».

---

## 0. Les trois niveaux (l'architecture de cette Constitution)

> **Nous ne construisons pas une carte Mapbox. Nous construisons une expérience YOOTOO.**
> Mapbox est *aujourd'hui* le moyen de l'exprimer — pas la définition de ce que nous sommes.

Cette Constitution est **indépendante de la technologie**. Si demain nous passons à MapLibre, Cesium,
Unreal, Apple Maps ou un moteur qui n'existe pas encore, **elle reste valable sans être réécrite** :
seul le Niveau 3 change.

| Niveau | Ce qu'il définit | Rythme de changement | Chapitres |
|---|---|---|---|
| **Niveau 1 — Vision** | émotions · valeurs · expérience · principes **immuables** | **ne change jamais** (amendement solennel) | §1, §8, §9 + le « immuable » de §7 |
| **Niveau 2 — Design System** | règles artistiques : lumière · volumes · couleurs · atmosphère · composition · hiérarchie · immersion · réalisme | **évolue lentement** (justifié terrain) | §2, §3, §5, §6 + l'« évolutif » de §7 |
| **Niveau 3 — Implémentation** | le moteur du jour : Mapbox/shaders/assets/JSON/modèles 3D/animations/optimisations | **évolue en continu** | §4 |

### La règle de préséance (absolue)
> **Niveau 1 prime sur Niveau 2. Niveau 2 prime sur Niveau 3.**

- Une contrainte technique (N3) ne justifie **jamais** de trahir une règle artistique (N2), et encore
  moins une émotion (N1). Si le moteur ne sait pas faire → on **simule, on stylise, ou on assume** — on
  ne renonce pas à l'expérience.
- Inversement, aucune prouesse technique (N3) n'a de valeur si elle ne sert pas une règle artistique
  (N2) qui elle-même sert une émotion (N1). *Le waouh gratuit est interdit par construction.*
- N1 est **agnostique** de toute technologie et de tout style. N2 est agnostique du moteur (il parle
  lumière/volume/couleur, pas `fill-extrusion`). N3 est le **seul** endroit où un nom de produit apparaît.

### Gouvernance — chaque PR cite ses articles
Toute PR touchant la carte doit **indiquer explicitement quels articles de la Constitution elle met en
œuvre** (ex. *« implémente N1 §1 (immersion), via N2 §2-Lumière, N2 §6 ; N3 : lumière v3 »*). Une PR qui
ne peut citer aucun article de Niveau 1 ou 2 n'a pas sa place (c'est du gadget — voir §8).

---

## 1. [Niveau 1 · Vision] Les émotions recherchées (classées)

À l'ouverture, dans l'ordre d'importance. Elles sont un **escalier** : chacune rend la suivante possible.

1. **Confiance** — *« cette carte ne me trahit pas ; ce qu'elle met en avant est vraiment bon. »*
   Sans elle, aucune envie ne tient. C'est le socle non négociable (l'or rare, le tri éditorial).
2. **Chaleur / proximité** — *« c'est ma ville, elle m'accueille. »* Le papier chaud, la lumière dorée,
   les commerces à taille humaine. On se sent chez soi, pas devant une base de données.
3. **Sérénité** — *« tout est calme, lisible, je respire. »* Aucune agression, aucune surcharge.
4. **Curiosité / envie d'explorer** — *« tiens… qu'est-ce que c'est ? »* Le moteur du produit :
   l'œil est attiré, la main veut balader la carte.
5. **Immersion** — *« je survole ma ville, j'y suis. »* Relief, profondeur, atmosphère.
6. **Qualité / prestige** — *« c'est soigné, rare, premium. »* Le détail juste, jamais tape-à-l'œil.
7. **Vie** — *« la ville respire, quelque chose bouge doucement. »* Lumière qui évolue, apparitions
   progressives, micro-mouvements.

**L'émotion-résultat**, celle qui prouve la réussite : **l'envie de sortir.** Les 7 ci-dessus ne sont
que les instruments ; l'envie de sortir est la symphonie.

> Règle de priorité émotionnelle : en cas de conflit, **la confiance et la sérénité priment sur
> l'immersion et le prestige.** On ne sacrifie jamais le calme pour le spectacle.

---

## 2. [Niveau 2 · Design System] Les grands piliers visuels

### Lumière — *le pilier n°1*
Une **seule** source, **chaude**, cohérente sur toute la carte (« heure dorée » douce). Elle raconte
**une heure de la journée**. Elle sculpte les volumes sans les durcir. Toute ombre raconte **la même**
histoire. La lumière est le premier levier du premium — avant la couleur, avant le détail.

### Couleurs
Famille **chaude et désaturée** (crème, sable, terracotta, vert sauge). Aucune couleur décorative :
chaque teinte a un rôle. Les **seules** couleurs fortes de la scène sont les **marqueurs** (langage
catégoriel) et **l'or** (exceptionnel, rare). Le fond ne rivalise jamais.

### Matériaux
Stylisés mais **crédibles** : pierre chaude, toits terracotta, eau mate, feuillage doux. On évoque la
matière (chaleur, âge, texture) sans la photographier. Jamais plastique, jamais métallique, jamais froid.

### Végétation
La **respiration** de la ville. Verts chauds désaturés, en profondeur (parcs, alignements, arbres
volumétriques discrets). Elle invite à la promenade — elle ne réclame jamais le regard.

### Architecture
Volumes **crédibles** (hauteurs réelles réduites pour le naturel), silhouettes variées, quelques
**repères** (cathédrale, monuments) comme ancres. Le bâti est le **décor** : présent, jamais héros.

### Eau
Un **repère spatial**, pas un sujet. Bleu-vert désaturé, mat, qui **oriente** l'œil le long de son
cours. Jamais « bleu piscine », jamais tape-à-l'œil.

### Routes
Des **flux**, pas des objets. Tons papier chauds, sans casing (fin du look GPS). Elles **guident** vers
les commerces ; le secondaire s'efface. Une route est une **invitation**, pas une destination.

### Ombres
**Douces et directionnelles** (même soleil que les marqueurs) + **occlusion ambiante** subtile à la
base des volumes. C'est ce qui transforme des boîtes en **vraie ville**. Jamais dures, jamais noires.

### Profondeur
Étagement premier plan → lointain, **brume atmosphérique** douce au loin, avant-plan net. Donne
l'immersion « vue de drone ». La profondeur se **suggère**, elle ne se force pas.

### Ciel / atmosphère
Un **fond chaud et calme** (dégradé doux, brume) qui pose l'heure et enveloppe la scène. Discret :
il cadre l'émotion, il n'est jamais le spectacle.

### Contrastes
Le **grand** contraste est *scène lumineuse ↔ interface sombre (verre dépoli)*. À l'intérieur de la
scène, les contrastes sont **doux** (cohésion) — sauf les marqueurs, qui **cassent** volontairement le
calme pour être vus.

### Textures
**Minimales.** Une texture ne se justifie que si elle ajoute de la **crédibilité** sans bruit. Par
défaut : surfaces mates, propres. Le grain vient de la **lumière et des ombres**, pas des motifs.

### Mouvements / animations / transitions
**Rares, douces, signifiantes.** Chaque mouvement informe ; aucun n'est gratuit. La caméra
**accompagne** (elle anticipe, cadre, révèle) et **s'efface** devant le geste. Les apparitions sont
**progressives**. Le **silence** (l'immobilité) fait partie du design. Rien ne clignote, rien ne rebondit.

---

## 3. [Niveau 2 · Design System] Les règles de composition

- **Où va le regard :** 1) le commerce (marqueur, surtout l'or) → 2) le quartier → 3) le territoire.
  **Jamais l'inverse.** Le premier objet fort rencontré doit être **un commerce**.
- **Prioritaire :** les marqueurs et la fiche. Ce sont les personnages.
- **Discret :** tout le reste (bâti, routes, labels, eau, parcs) = décor et repères. Acteurs
  secondaires et figurants (voir la *règle du cinéma* : un figurant ne vole jamais la vedette).
- **Respirer :** de l'air autour des points d'intérêt ; des zones calmes ; jamais de « mur » d'éléments.
- **Éviter la surcharge :** **règle d'or — chaque ajout doit permettre d'en retirer deux.** Le texte
  est rare (villes, quartiers, quelques ancres). Les POI génériques sont supprimés. La densité vit dans
  les **marqueurs**, pas dans le fond.
- **La question permanente :** *cette couche aide-t-elle à découvrir un commerce ?* Sinon → elle recule.

---

## 4. [Niveau 3 · Implémentation] Les règles du moteur *(instantané — remplaçable)*

> **Ce chapitre est le SEUL lié à une technologie.** Il décrit le moteur du jour et **change en
> continu**. Le remplacer (MapLibre, Cesium, Unreal, Apple Maps…) **ne touche ni le Niveau 1 ni le
> Niveau 2** : on réécrit uniquement ce tableau. Ce qui suit ne définit **pas** l'expérience — il dit
> seulement *comment* l'exprimer aujourd'hui.

Pour ne jamais promettre ce que le moteur ne tient pas. Cible actuelle : **Mapbox GL JS v3**.

| Élément | Statut technique |
|---|---|
| Lumière chaude cohérente (ambient + directional) | ✅ **natif** (`lights` v3) |
| Ombres dynamiques + occlusion ambiante | ✅ **natif** (v3, coût GPU → mesurer mobile) |
| Ciel / brume / atmosphère | ✅ **natif** (`fog`, `sky`) |
| Bâtiments 3D (volumes, couleur, lumière) | ✅ **natif** (`fill-extrusion`) |
| Caméra oblique / pitch / vols | ✅ **natif** |
| Marqueurs vivants (pins, badges, halo) | ✅ **astuce** (HTML/CSS — notre force) |
| Trajet au sol / anneau de sélection | ✅ **astuce** (couches `line` / `circle` / custom) |
| Végétation 3D (arbres) | 🟡 **modèles 3D** (glTF via couche `model`) ou arbres Standard |
| Repères / monuments 3D | 🟡 **modèles 3D** curatés (ou 3D landmarks Standard) |
| Icônes catégorie / badges premium | 🎨 **assets** (sprite/SDF) |
| Voile de profondeur / vignette | 🎨 **assets/overlay** (CSS/canvas — pas un vrai DoF) |
| Toits **photo-texturés** par bâtiment | ⛔ **impossible** à l'échelle ville |
| Illumination globale / path tracing | ⛔ **impossible** (moteur temps réel) |
| Profondeur de champ (bokeh) réelle | ⛔ **impossible** nativement → simulée |
| Reflets d'eau réalistes, foule animée, pavés | ⛔ **impossible** nativement |

**Principe :** ~80 % du « waouh » (lumière + ombres + profondeur + volumes + marqueurs) est **natif**.
Les 20 % impossibles (rendu photo) ne sont **pas** ce qui crée l'émotion → on les **simule** ou on les
**assume**, sans jamais mentir sur la faisabilité.

---

## 5. [Niveau 2 · Design System] Les règles de réalisme

> **On ne veut pas une carte photoréaliste. On veut une carte crédible.** C'est essentiel.

Le photoréalisme cherche l'exactitude ; nous cherchons la **véracité ressentie**. Une ville à **80 %**
de sa hauteur réelle qui *paraît* naturelle vaut mieux qu'à 100 % qui paraît artificielle. **La
crédibilité prime sur l'exactitude.**

**Où l'on stylise volontairement la réalité :**
- **Hauteurs** réduites (~80 %) → naturel, anti-maquette.
- **Couleurs** désaturées et harmonisées → cohésion, calme (la vraie ville est plus bruyante).
- **Marqueurs** surdimensionnés vs les bâtiments → lisibilité > échelle réelle.
- **Densité de texte** volontairement pauvre → on efface ce que la réalité affiche partout (POI).
- **Lumière** unique et idéalisée (« heure dorée ») → une réalité choisie, pas l'éclairage brut.
- **Matériaux** évoqués, non photographiés → crédibles sans le coût (ni le froid) du photoréalisme.

Le test : *« on dirait une maquette » = perdu ; « j'ai reconnu ma ville » = gagné.*

---

## 6. [Niveau 2 · Design System] Les règles d'immersion (le 20/80 du waouh)

Le waouh ne vient **pas** de la richesse. Il vient de **quelques ingrédients justes** :

**Les 20 % qui produisent 80 % de l'émotion :**
1. **Lumière chaude cohérente** (heure dorée). — le plus grand levier, à lui seul.
2. **Ombres douces + occlusion ambiante.** — transforme des boîtes en ville vivante.
3. **Profondeur** (brume + étagement). — l'immersion « je survole ».
4. **Volumes 3D crédibles** (+ 2–3 repères). — le relief qui fait reconnaître son quartier.
5. **Marqueurs vivants premium.** — les héros, le point focal.

**Ce qui n'apporte presque rien (et coûte cher) :** toits photo-texturés, reflets, foules, pavés,
effets 3D spectaculaires. On s'en passe.

**La discipline anti-surcharge de l'immersion :** ajouter du réalisme **sans** ajouter de bruit. Chaque
effet doit passer le filtre : *rend-il la scène plus crédible et plus calme, ou plus chargée ?* Si
chargée → rejeté. **L'immersion se gagne par la lumière, pas par le nombre d'éléments.**

---

## 7. [Niveaux 1→3] Les règles d'évolution (tenir des années)

> Ce chapitre **traverse les trois niveaux** : l'« immuable » est Niveau 1, l'« évolutif » est
> Niveau 2, les leviers techniques (presets, LOD…) sont Niveau 3.

### Immuable (ne change jamais sans un amendement à cette constitution)
- Les commerces sont les **héros** ; le fond recule.
- **Une seule** lumière / une seule direction.
- **L'or est rare** (distinction éditoriale, pas récompense).
- La couleur = la **catégorie** (langage pré-attentif).
- **La technologie disparaît** ; l'envie de sortir prime.
- La règle d'or (chaque ajout en retire deux).

### Peut évoluer (avec justification terrain)
- Les **teintes exactes**, les seuils, les tailles (calibration par ville, par écran).
- Le **degré de réalisme** (plus/moins d'ombres, d'atmosphère) selon la perf et le ressenti.
- Le **design des marqueurs** (tant qu'il reste 4 états et lisible en < 1 s).

### Dépend des **saisons**
Palette végétale, ambiance de lumière, événements (marchés, fêtes) mis en avant.

### Dépend de **l'heure**
Preset de lumière (matin / après-midi / soir / nuit) ; le soir, les commerces ouverts ressortent ; la
nuit reste **chaude et rassurante** (jamais une inversion froide).

### Dépend du **zoom**
Territoire → ville → quartier → rue → commerce. Le pitch augmente avec l'intimité. Les éléments
**apparaissent dans l'ordre éditorial** (les meilleures adresses d'abord). Le texte n'arrive qu'utile.

### Dépend du **contexte**
Moment, saison, préférences → l'**importance** des lieux évolue (le style, lui, ne change pas). Marché
le samedi matin, café le matin, terrasse le soir.

---

## 8. [Niveau 1 · Vision] Les anti-règles (ce que YOOTOO ne doit JAMAIS devenir)

- ❌ **Un clone Google Maps** — optimisé navigation, froid, encyclopédique.
- ❌ **Un clone Apple Plans** — beau mais générique, sans point de vue éditorial.
- ❌ **Un clone Waze** — trafic, alertes, agressif, utilitaire.
- ❌ **Un jeu vidéo** — 3D spectaculaire gratuite, effets, « maquette ».
- ❌ **Une carte touristique** — POI partout, monuments pour le tourisme, bruit.
- ❌ **Une carte trop sombre** — la scène reste chaude et lumineuse (l'interface peut être sombre, pas la carte).
- ❌ **Une carte surchargée** — murs d'icônes, de labels, de couleurs.
- ❌ **Une carte gadget** — animations qu'on remarque, effets qui impressionnent puis lassent.
- ❌ **Une carte froide / corporate / SIG** — grise, bleutée, technique.
- ❌ **Une base de données déguisée** — tout afficher « au cas où ».

Test unique : *si l'utilisateur se souvient de la technologie ou du fond plutôt que d'un commerce où
il a envie d'aller — on a échoué.*

---

## 9. [Niveau 1 · Vision] Le manifeste (une page)

> **La carte YOOTOO.**
>
> Nous ne dessinons pas une carte. Nous mettons en scène une **envie de sortir**.
>
> Notre carte est **chaude, calme et vivante**. La lumière y raconte une heure douce ; la ville y
> respire ; les rues y **guident** au lieu de crier. Le fond ne cherche jamais l'attention — il
> **recule** pour que les commerces deviennent les **héros**. Une seule couleur forte a le droit de
> briller : celle des lieux qui valent le détour. Et l'**or**, rare, dit une seule chose : *« si tu ne
> devais découvrir qu'un endroit aujourd'hui, ce serait celui-ci. »*
>
> Nous cherchons la **crédibilité**, pas le photoréalisme. Une ville qu'on **reconnaît**, pas une
> maquette qu'on admire. Le relief, les ombres et l'atmosphère sont là pour une seule raison :
> **l'immersion** — le sentiment de survoler *sa* ville. Jamais pour le spectacle.
>
> Chaque mouvement a une raison. Chaque couleur a un sens. Chaque silence est voulu. Nous ajoutons du
> réalisme **sans** ajouter du bruit, parce que l'émotion vient de la **lumière**, pas du nombre.
>
> Nous ne voulons pas qu'on dise *« quelle belle carte »*. Nous voulons qu'on dise : *« je ne sais pas
> pourquoi… mais j'ai envie d'aller vivre mon quartier. »*
>
> Le jour où la technologie disparaît et où il ne reste que cette envie — **la carte YOOTOO existe.**

---

*Préséance : **Niveau 1 (Vision) > Niveau 2 (Design System) > Niveau 3 (Implémentation).** Le style
`yootoo-s1.json` est du Niveau 3 : il **sert** la Constitution, il ne la définit pas, et il est
remplaçable sans réécrire les Niveaux 1 et 2. Tout amendement au Niveau 1 est solennel ; au Niveau 2,
délibéré et tracé ; au Niveau 3, libre tant qu'il sert les niveaux supérieurs. Chaque PR cite ses articles.*
