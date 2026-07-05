# Le langage visuel définitif de YOOTOO

> **Objectif : une capture d'écran suffit à dire « c'est YOOTOO » — sans voir le logo.**
> Élégance silencieuse. Une carte qui semble évidente, comme si elle avait toujours existé.

> On ne cherche pas la tendance, on cherche l'**intemporel**. Chaque détail doit sembler avoir
> toujours été à sa place — et le sembler encore dans cinq ans. On ne dessine plus une carte : on
> dessine **une nouvelle manière de vivre un territoire.**

Ce document **fige** l'identité visuelle de la carte et **impose la méthode** de toute finition. Il
ne remplace pas [DESIGN-SYSTEM](./DESIGN-SYSTEM.md) (le détail) ni [STYLE](./STYLE.md) (le fond) : il
les **couronne** — la référence unique de ce qui est *définitif* et de *comment on polit*.

---

## 0. La règle d'or de cette phase

> **Cette modification augmente-t-elle la qualité perçue SANS augmenter la complexité ?**
> Si non → on ne la développe pas. On ne touche **pas** au moteur. On n'ajoute **aucune** fonctionnalité.

Et, hérité de la méthode terrain : **aucune décision sur la seule intuition.** Tout changement
visuel passe par une **carte MESURE** (§4). Une carte sans *Observation* réelle reste bloquée.

---

## 1. Ce qui est FIGÉ (ne se rediscute pas sans ADR)

| Élément | Décision définitive | Source |
|---|---|---|
| **États de marqueur** | **4, et 4 seulement** : Standard · Recommandé · Exceptionnel · Sélectionné. Aucun autre. | [ADR-004](./adr/README.md) |
| **Rôle du marqueur** | Il raconte, avant même l'ouverture : **l'importance** du lieu, sa **personnalité** (catégorie), la **confiance** que YOOTOO lui accorde. | DESIGN-SYSTEM §5 |
| **L'or** | **Rare (~2,8 %)**. Pas une note Google — une **décision éditoriale** : « YOOTOO pense que ce lieu mérite particulièrement votre attention ». Identifiable sans être agressif. | [ADR-011](./adr/README.md) |
| **Langage des couleurs** | La couleur = la **catégorie** (pré-attentif). Aucune couleur décorative : chaque teinte a un sens. | [ADR-005](./adr/README.md) · [ADR-006](./adr/README.md) |
| **Le fond** | Ne cherche **jamais** l'attention. Il **révèle le territoire** et laisse **respirer** les commerces. | [ADR-010](./adr/README.md) · STYLE |
| **La lumière** | **Une seule** source, **une seule** direction (haut-gauche, chaude). Toutes les ombres racontent **la même** histoire. | DESIGN-SYSTEM §3 |
| **Le rythme** | Animations discrètes, apparitions progressives, transitions qui respirent. **Le silence fait partie du design.** | DESIGN-SYSTEM §6 · CAMERA |
| **Le mouvement** | La caméra est invisible ; elle ne bouge jamais sans raison ; l'utilisateur gagne toujours. | [ADR-007](./adr/README.md) · [ADR-008](./adr/README.md) |

**Interdits permanents** : un 5ᵉ état de marqueur · une couleur décorative · une 2ᵉ direction de
lumière · une animation qu'on *remarque* · un fond qui rivalise avec les commerces.

---

## 2. La hiérarchie visuelle (l'ordre du regard à l'ouverture)

```
1. les commerces importants   ← l'œil tombe ici en premier
2. le quartier                ← il situe
3. le territoire              ← il oriente
        (jamais l'inverse)
```

Traductions concrètes déjà actées :
- **Commerces d'abord** : seul point de forte couleur (marqueurs), fond désaturé qui recule.
- **Quartier** : land-use + repères + eau qui orientent sans crier (STYLE).
- **Territoire** : typographie **ville → quartier → rue** (jamais l'inverse) ; POI génériques supprimés.

---

## 3. La palette, une intention par couleur

Aucune teinte n'est là « pour faire joli ». La palette **évoque** :

| Évoque | Porté par |
|---|---|
| **Confiance** | l'or rare (distinction éditoriale) · le vert YOOTOO du sélectionné |
| **Proximité** | le papier chaud du fond · les distances « à pied » |
| **Découverte** | les 10 teintes de catégorie (reconnaître sans lire) |
| **Qualité** | la photo héros · les halos subtils · l'ombre unique |
| **Local** | le vert sauge des producteurs · l'ocre du centre historique |

---

## 4. Le protocole MESURE (obligatoire pour tout polish)

Chaque amélioration visuelle est une **carte** avec ces cinq champs. Tant que l'**Observation** n'est
pas réelle (terrain, données, ou test), la carte reste en attente — **on ne code pas sur intuition.**

```
OBSERVATION        (fait constaté : donnée corpus, session terrain, ou test utilisateur)
   ↓
HYPOTHÈSE          (« si on change X, alors Y »)
   ↓
MODIFICATION       (le changement précis, minimal, réversible — jamais le moteur)
   ↓
RÉSULTAT ATTENDU   (l'amélioration de qualité perçue visée)
   ↓
VÉRIFICATION TERRAIN (comment on saura que c'est mieux — grille FIELD_OBSERVATION)
```

---

## 5. Le backlog de finition (cartes MESURE)

Priorisées, chacune tracée. Statut : ✅ fait · 🟢 prêt (observation acquise) · ⏳ **bloqué** (attend
une observation terrain — à collecter avec [FIELD_OBSERVATION](./FIELD_OBSERVATION.md)).

### F-01 · L'or rare — ✅ fait
- **Observation** : audit corpus (676 commerces) → l'or touchait **36,5 %** des commerces.
- **Hypothèse** : bander par le score éditorial rend l'or rare → il *signifie* à nouveau.
- **Modification** : `markerState` bandé (or ≈ 2,8 %). Visuel inchangé.
- **Résultat attendu** : la couronne redevient une distinction ; le fond respire.
- **Vérification terrain** : sur un écran de centre-ville, **0–1 or** ; l'œil y va en premier. *(à confirmer)*

### F-02 · Le fond qui recule (style S1) — 🟢 prêt
- **Observation** : le défaut `streets-v12` est froid, saturé, saturé de POI (audit STYLE §1).
- **Hypothèse** : un papier chaud désaturé fait ressortir les marqueurs (les héros).
- **Modification** : publier le style Studio S1 → `EXPO_PUBLIC_MAPBOX_STYLE_URL` (aucun code app).
- **Résultat attendu** : capture reconnaissable en < 1 s ; marqueurs = seule couleur forte.
- **Vérification terrain** : montrer 2 captures (avant/après) à 5 personnes → « laquelle donne envie ? ».

### F-03 · Lisibilité au soleil — ⏳ bloqué (scénario I)
- **Observation** : *à collecter* — labels/halos tiennent-ils écran à ~50 % de luminosité, dehors ?
- **Hypothèse** : si les labels pâlissent au soleil, renforcer halo/contraste labels (style, pas moteur).
- **Modification** : *à définir après observation*.
- **Résultat attendu** : tout reste net en plein soleil sans « plisser les yeux ».
- **Vérification terrain** : session « plein soleil », note *Lisibilité* ≥ 8.

### F-04 · Le pop de sélection — ⏳ bloqué
- **Observation** : *à collecter* — le pop (105 %, ~200 ms) est-il **ressenti** ou **remarqué** ?
- **Hypothèse** : s'il est remarqué, il est trop fort → réduire l'amplitude/durée.
- **Modification** : ajuster `MARKER_POP` (token unique). *Après observation seulement.*
- **Résultat attendu** : « ça répond » sans « regarde l'animation ».
- **Vérification terrain** : demander après un tap « as-tu vu une animation ? » — l'idéal est *non*.

### F-05 · Halos qui se fondent (anti-sapin de Noël) — ⏳ bloqué
- **Observation** : *à collecter* — sur un écran dense (centre historique), l'ensemble est-il calme ?
- **Hypothèse** : si ça « scintille », baisser l'alpha des halos recommandé/exceptionnel.
- **Modification** : ajuster `haloAlpha` (tokens). *Après observation.*
- **Résultat attendu** : les marqueurs *se fondent* dans la carte, aucun bruit.
- **Vérification terrain** : session « centre historique », note *Fluidité/Calme* ≥ 8.

### F-06 · Transition cluster → marqueur — ⏳ bloqué
- **Observation** : *à collecter* — l'éclatement d'un cluster au zoom est-il fluide ou brutal ?
- **Hypothèse** : si brutal, adoucir le fondu d'apparition (déjà présent) / la cadence.
- **Modification** : *à définir après observation* (rendu, pas moteur).
- **Résultat attendu** : « la ville révèle ses adresses » (préfigure la Phase 5, non incluse ici).
- **Vérification terrain** : zoomer/dézoomer 10× → aucun « saut » ressenti.

### F-07 · Mode nuit (ambiance) — ⏳ bloqué (scénario Nuit, dépend S2)
- **Observation** : *à collecter* le soir — la carte reste-t-elle **rassurante** ?
- **Hypothèse** : une ambiance tiède (pas une inversion) + ouverts qui ressortent = envie de sortir.
- **Modification** : style nuit S2 (STYLE §7). *Après observation nocturne.*
- **Résultat attendu** : « j'ai envie de sortir *ce soir* ».
- **Vérification terrain** : session nuit, note *Envie d'explorer* ≥ 8.

> Les cartes ⏳ **ne se codent pas** tant que leur *Observation* n'est pas remplie. C'est le cœur de
> la méthode : la finition vient du terrain, pas de l'écran.

---

## 6. Le critère de succès (comment on saura qu'on a réussi)

Pas « quelle belle carte ». Mais :

> **« Je ne sais pas pourquoi… mais j'aime explorer avec YOOTOO. »**

Et l'indicateur ultime, à guetter en session : **quelqu'un ouvre YOOTOO sans destination, juste pour
parcourir son quartier.** Le jour où ça arrive, on a créé un **compagnon d'exploration**, pas une carte.

---

## 7. Ce que je ne peux pas décider seul (honnêteté)

Le **rendu** (l'or perçu comme précieux, les halos qui se fondent, le pop ressenti-pas-remarqué, la
lisibilité au soleil) **se juge à l'œil, dehors** — pas dans le code. Ma part : figer le langage,
tokeniser les leviers (une valeur = un endroit), et tenir la discipline MESURE. **Ta part** : marcher,
observer, remplir les *Observations* — c'est ce qui débloque chaque carte.
