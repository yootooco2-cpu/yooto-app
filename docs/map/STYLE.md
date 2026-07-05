# YOOTOO Map Style — Direction artistique

> **Statut : proposé — à valider avant tout code.** Les hex sont des points de départ à calibrer
> sur la vraie carte (je ne peux pas juger le rendu web à ta place).

> On ne dessine pas une carte. On dessine **une invitation à sortir.** Quand un utilisateur ouvre
> YOOTOO, avant même de toucher la carte, il doit ressentir : *« c'est un endroit où j'ai envie
> d'aller ».* Une capture doit être reconnaissable en **moins d'une seconde, sans voir le logo.**

---

## 0. La thèse (à lire en premier)

**Le fond de carte n'est pas le héros — les commerçants le sont.** (Design System §2.) Le style
YOOTOO est donc un **papier chaud, calme, désaturé** qui **s'efface** pour laisser vivre les
marqueurs (langage de 10 couleurs + or « exceptionnel »). Une carte « spectaculaire » qui rivalise
avec les marqueurs échoue à la règle absolue.

Trois mots gouvernent chaque décision : **chaud · calme · qui respire.** Tout ce qui n'invite pas à
explorer est bruit, et le bruit se retire.

Cohérence système : même **famille chromatique** que l'app (`background #F7F4EC`, `primary #1F7A4D`)
et **une seule source de lumière** (haut-gauche, chaude) que les marqueurs (ombre directionnelle) →
la carte et les pastilles semblent éclairées par le même soleil.

---

## 1. Audit du style actuel — `mapbox://styles/mapbox/streets-v12`

Le défaut (aucun `EXPO_PUBLIC_MAPBOX_STYLE_URL`) est **Mapbox Streets v12** : un style de navigation
généraliste. Ce qu'il coûte à YOOTOO :

| Élément | Constat | Problème |
|---|---|---|
| **Ambiance** | blanc/gris froid, saturé | « SIG / Google » — aucune identité, aucune chaleur |
| **Routes** | jaunes/oranges vifs, casings marqués, hiérarchie tape-à-l'œil | **bruit visuel** : la voirie crie plus fort que les commerces |
| **POI** | des centaines d'icônes génériques (Mapbox) | la carte raconte **la base de données**, pas le territoire ; concurrence les marqueurs |
| **Eau** | bleu « touristique » plat | simple aplat, ne **guide** pas l'œil |
| **Végétation** | vert unique, plat | aucune évocation (promenade, fraîcheur) |
| **Labels** | hiérarchie faible, halos blancs durs | ville / quartier / rue se marchent dessus |
| **Bâtiments** | gris froids | ne préparent pas la 3D, n'ajoutent pas de chaleur |
| **Contraste** | pensé pour la conduite | mange l'attention que doivent capter les marqueurs |
| **Nuit** | inversion basique (si activée) | pas d'ambiance, pas de « ville rassurante » |

**Verdict** : Streets v12 optimise la **navigation**. YOOTOO optimise **l'envie de sortir**. Deux
buts opposés → il faut un style **propriétaire**.

---

## 2. Principes artistiques (la DA)

1. **Reculer pour révéler.** Le fond est un papier chaud faiblement saturé ; les marqueurs sont les
   seuls points de forte couleur. *Test : sur une capture, l'œil doit tomber d'abord sur un marqueur.*
2. **Chaleur.** Base crème/sable (jamais blanc clinique, jamais gris froid). La ville semble
   ensoleillée, accueillante.
3. **Calme.** Moins d'éléments, plus d'air. Chaque couche retirée est une victoire (règle d'or :
   un ajout doit permettre d'en retirer deux).
4. **Guider, pas décorer.** Routes principales et eau **orientent** ; le secondaire **s'efface**.
5. **Raconter le territoire.** Quartiers (historique, résidentiel), repères naturels et monuments —
   pas les POI de Mapbox.
6. **Une seule lumière.** Haut-gauche, chaude — cohérente avec l'ombre des marqueurs (réalisme
   ressenti, jamais remarqué).
7. **Premium = retenue.** L'élégance vient de la sobriété et de la justesse des contrastes, pas de
   la saturation.

---

## 3. Palette complète (proposée)

Faible saturation, dominante chaude, verts « promenade ». Jour d'abord ; nuit en §7.

### 3.1 Sol, eau, quartiers
| Rôle (token) | Teinte | Hex (jour) | Intention |
|---|---|---|---|
| **MapBackground** | papier crème | `#F3EEE2` | chaleur, calme ; base neutre qui recule |
| **Residential** | crème à peine tiédie | `#EFE9DB` | quartiers de vie, discrets |
| **Commercial** | sable légèrement plus chaud | `#F1E7D6` | zone d'activité, subtilement « vivante » |
| **Historic** | ocre/pierre douce | `#EBE0C9` | centre ancien — guide vers le cœur (lie la caméra `historic`) |
| **Industrial** | grège plus froid | `#E7E3D8` | recule franchement (peu désirable) |
| **Water** | eau sauge-ardoise | `#A9C7C4` | **repère** : contraste calme avec le papier, oriente l'œil |
| **WaterEdge** | liseré eau plus dense | `#8FB3AF` | berges lisibles (rivières/canaux du Lez, Verdanson) |

### 3.2 Végétation (palette « promenade / fraîcheur »)
La végétation n'est pas « verte » : elle **respire**. Verts sauge chauds, en couches.
| Rôle (token) | Teinte | Hex | Usage |
|---|---|---|---|
| **VegetationPark** | vert sauge clair | `#CDD9B4` | parcs, jardins (Peyrou, Jardin des plantes) — fraîcheur, détente |
| **VegetationTree** | frondaison | `#BACb9F` | bois, alignements — profondeur végétale |
| **VegetationGrass** | prairie douce | `#D6DFBF` | pelouses, terrains — respiration |

> Harmonie : famille du vert sauge des **producteurs** (`#7D9068`), mais **plus clairs et
> désaturés** → la végétation accompagne sans voler la vedette aux marqueurs.

### 3.3 Voirie (hiérarchie qui guide)
| Rôle (token) | Fill | Casing | Comportement au zoom |
|---|---|---|---|
| **RoadPrimary** | `#FFFDF8` | `#E7DAC0` (chaud) | **toujours** visible, guide les grands axes |
| **RoadSecondary** | `#F6F1E6` | — | apparaît en quartier, **sans casing** |
| **RoadTertiary / résidentiel** | `#F1ECE0` | — | quasi invisible de loin, **émerge** seulement à la rue |
| **RoadPath / promenade** | `#E9D9BE` pointillé | — | sentiers/berges : invitation à marcher |

Principe : **le contraste voirie diminue quand le zoom augmente peu** — les rues secondaires
**disparaissent progressivement** pour réduire le bruit ; seuls les axes structurants persistent.

### 3.4 Bâti, labels, cadres, lumière
| Rôle (token) | Hex | Note |
|---|---|---|
| **Building** | fill `#ECE3D2` / outline `#E0D5C0` | chaud ; **prêt pour la 3D** (extrusion douce plus tard) |
| **Shadow** | `rgba(23,32,26,0.10)` | même langage d'ombre que les marqueurs (contact/profondeur) |
| **Lighting** | soleil haut-gauche, chaud | cohérence globale de la lumière |
| **LabelPrimary** | `#3A3931` | villes/quartiers ; halo crème `#F3EEE2` |
| **LabelSecondary** | `#89836F` | rues ; halo crème |
| **LabelWater** | `#5E8B86` | hydronymes (le nom « guide » vers l'eau) |
| **Borders** (admin) | `#D6CDB9` pointillé fin | présents mais discrets |

---

## 4. Hiérarchie visuelle

### 4.1 Typographie — **ville → quartier → rue → commerce**, jamais l'inverse
| Niveau | Taille / graisse | Couleur | Apparaît à |
|---|---|---|---|
| **Ville** | la plus grande, medium, léger interlettrage | `LabelPrimary` | zoom large |
| **Quartier** | moyenne | `LabelPrimary` atténué | zoom quartier |
| **Rue** | petite | `LabelSecondary` | zoom rue |
| **Commerce** | *porté par les marqueurs* (pas par le fond) | langage marqueurs | zoom commerce |

Le **commerce n'est jamais un label de fond** : il vit dans la couche marqueurs (le héros). Le fond
ne doit jamais titrer plus fort que la ville en vue large.

### 4.2 POI — **réduction forte**
On **désactive** la quasi-totalité des POI génériques Mapbox. Ne restent que : hydronymes, grands
parcs, et **monuments repères** (§5). La carte raconte le territoire ; les commerces YOOTOO sont les
seuls « POI » qui comptent.

### 4.3 Monuments — des **repères**, jamais des distractions
Montpellier : Place de la Comédie, Cathédrale Saint-Pierre, Arc de Triomphe, Promenade du Peyrou,
Jardin des plantes, Gare Saint-Roch, Halles (Castellane/Laissac). Traitement : **pictogramme sobre +
label discret**, densité très basse, apparition **au bon zoom** → ils **ancrent** l'orientation sans
attirer l'œil au détriment des marqueurs.

---

## 5. Design Tokens cartographiques (spec — à coder plus tard : `design/tokens/mapStyle.ts`)

Source unique, harmonisée avec `colors.ts` et `mapMarkers.ts`. **Jour + Nuit.**

| Token | Jour | Nuit |
|---|---|---|
| `MapBackground` | `#F3EEE2` | `#1C242B` |
| `Water` | `#A9C7C4` | `#151E27` |
| `WaterEdge` | `#8FB3AF` | `#20303A` |
| `VegetationPark` | `#CDD9B4` | `#232E24` |
| `VegetationTree` | `#BACB9F` | `#1E2820` |
| `VegetationGrass` | `#D6DFBF` | `#263025` |
| `Residential` | `#EFE9DB` | `#20282F` |
| `Commercial` | `#F1E7D6` | `#262C31` |
| `Historic` | `#EBE0C9` | `#2A2A2E` |
| `Industrial` | `#E7E3D8` | `#1E242A` |
| `RoadPrimary` | `#FFFDF8` | `#39424C` |
| `RoadSecondary` | `#F6F1E6` | `#2A323A` |
| `Building` | `#ECE3D2` | `#232B32` |
| `Labels` | `#3A3931` | `#D9D3C5` |
| `Borders` | `#D6CDB9` | `#333B43` |
| `Shadow` | `rgba(23,32,26,0.10)` | `rgba(0,0,0,0.35)` |
| `Lighting` | soleil chaud haut-gauche | lueur tiède, basse |

> Règle : la **saturation du fond reste basse dans les deux modes** → les marqueurs dominent toujours.

---

## 6. Bâtiments & 3D (préparer, ne pas masquer)

Le style doit être **parfait en 2D d'abord**. Le bâti 2D (`Building`) est déjà chaud et lisible.
La 3D (Phase 2, `fill-extrusion` douce) viendra **enrichir** : extrusion basse, ombre haut-gauche
cohérente, **jamais** de cubes qui masquent les rues ou les marqueurs. Le token `Building` +
`Shadow` + `Lighting` sont déjà pensés pour ça. → [DESIGN-SYSTEM §9 Terrain/3D](./DESIGN-SYSTEM.md).

---

## 7. Mode nuit — une **ambiance**, pas une inversion

Le soir, la ville reste **rassurante et chaude** (pas un négatif froid).
- **Fond** bleu-vert profond désaturé (`#1C242B`), jamais noir pur.
- **Eau** plus sombre avec un léger reflet → toujours un repère.
- **Routes** tièdes et douces ; les secondaires **s'effacent** presque totalement.
- **Labels** blanc cassé chaud, halo sombre → lisibles sans éblouir.
- **Lumière** basse et tiède (lampadaires) → sensation naturelle, pas clinique.
- **Commerces ouverts plus visibles** : le fond nocturne fait **ressortir** les marqueurs ; l'état
  « ouvert » peut être légèrement renforcé le soir (hook — couche marqueurs, pas le style ;
  s'appuie sur `timeSignals` existant). *La ville allumée invite à sortir ce soir.*

Bascule jour/nuit : deux styles (URLs) sélectionnés selon l'heure (`timeSignals`) — transition douce
(pas de flash). Détail de bascule à câbler avec le Camera/Map Engine.

---

## 8. Plan d'implémentation Mapbox Studio

1. **Style de base** : partir d'un fond **neutre** (Mapbox *Light* ou une base vierge) — **pas**
   Streets, **pas** Standard (trop reconnaissables → violent « pas un thème Mapbox »).
2. **Sol / land-use** : appliquer `MapBackground` + `Residential/Commercial/Historic/Industrial`.
3. **Eau** : `Water` + `WaterEdge`, labels d'hydronymes activés.
4. **Végétation** : 3 couches (`Park/Tree/Grass`).
5. **Voirie** : recolorer par classe ; **supprimer les casings vifs** ; régler l'opacité par zoom
   pour faire **disparaître** progressivement le secondaire.
6. **POI** : désactiver les couches symboles génériques ; ne garder qu'hydronymes + grands parcs.
7. **Monuments** : couche curatée (Montpellier) — pictos sobres, densité basse, seuils de zoom.
8. **Typographie** : échelle ville→quartier→rue ; halos crème ; graisses/tailles par classe.
9. **Bâti** : `Building` + outline ; préparer la couche `fill-extrusion` (désactivée en 2D).
10. **Export** : publier → renseigner `EXPO_PUBLIC_MAPBOX_STYLE_URL` (aucun code applicatif à changer :
    `config.ts` lit déjà cette variable). Idem pour la variante **nuit** (2ᵉ URL).

> Aucune modification de code applicatif pour le style **jour** : c'est déjà branché par
> `getMapConfig()`. Le style est un **artefact Studio**, versionné à part (JSON exportable en S5).

---

## 9. Roadmap progressive

| Étape | Contenu | Impact |
|---|---|---|
| **S1 — Jour** | papier + eau + végétation + hiérarchie voirie + réduction POI + typo | **le grand saut d'identité** (remplace streets-v12) |
| **S2 — Nuit** | style nuit + bascule jour/nuit (`timeSignals`) | ambiance, « ville rassurante » |
| **S3 — Monuments** | repères curatés Montpellier | orientation, ancrage territorial |
| **S4 — Bâti/3D-ready** | raffinage bâti + couche extrusion prête | prépare la Phase 2 sans casser la 2D |
| **S5 — Tokens & style-as-code** | `design/tokens/mapStyle.ts` + génération du style JSON versionné | source unique, évolutif, testable |

---

## 10. Questions ouvertes (à trancher — non inventées)

1. **Une ville d'abord ?** On calibre sur **Montpellier** (données réelles), puis on généralise —
   ou palette « nationale » d'emblée ? (Reco : Montpellier d'abord, c'est là que vit le produit.)
2. **Jeu de données monuments** : liste curatée YOOTOO vs POI Mapbox filtrés (qualité vs effort).
3. **Bascule jour/nuit** : seuils horaires (via `timeSignals`) + transition (setStyle vs deux
   sources) — à câbler avec le Map Engine.
4. **Calibration fine** des hex sur écran réel (le papier peut « jaunir » selon l'écran ; l'eau doit
   rester un repère sans virer « piscine »).

---

## Objectif final

Nous ne cherchons pas la plus belle carte. Nous cherchons **la carte qui donne le plus envie de
vivre sa ville.** Chaque teinte, chaque route effacée, chaque parc qui respire sert cette émotion.
→ [ADR-010](./adr/README.md).
