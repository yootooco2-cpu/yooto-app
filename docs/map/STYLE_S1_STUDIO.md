# S1 — Guide Mapbox Studio (direction artistique par couche)

> S1 n'est **pas** un exercice de couleur. C'est un exercice de **hiérarchie visuelle** : on ne
> recolore pas une carte, on **organise l'attention humaine.**

> La consigne : ne cherche jamais une carte spectaculaire. Cherche une carte **qui disparaît.**
> Si l'utilisateur se souvient du fond, on a échoué. S'il se souvient des commerces, on a réussi.

Ce guide se suit **dans Mapbox Studio**. Base de départ : un style **neutre** (Mapbox *Light* ou
vierge — **pas** Streets, **pas** Standard, trop reconnaissables). Valeurs cibles = tokens jour de
[STYLE.md](./STYLE.md). On ne touche qu'aux **6 familles** listées ci-dessous. **Rien d'autre.**

> **Dépendance** : la charte de palette `STYLE.md` arrive avec la PR de direction artistique du style
> (ouverte). Ce guide **inline** les valeurs cibles → il est **autonome** même avant ce merge ; les
> liens vers `STYLE.md` deviennent actifs une fois la charte fusionnée.

---

## 0. La règle absolue — exploiter l'ordre de lecture du cerveau

Le cerveau lit dans cet ordre : **surfaces → lignes → objets → texte.** On s'en sert :

| Ordre | Ce que le cerveau lit | Dans YOOTOO | Consigne S1 |
|---|---|---|---|
| 1 | **Surfaces** | sol, eau, parcs, bâtiments | **Doivent RECULER** (faible contraste) — lues en premier, donc à calmer |
| 2 | **Lignes** | routes | **GUIDENT** — les axes structurent, le secondaire s'efface |
| 3 | **Objets** | **les marqueurs = les commerces** | Doivent être **les seuls objets forts** → on **supprime** les POI concurrents |
| 4 | **Texte** | labels | **Minimal & hiérarchisé** — ville → quartier → rue |

Conséquence directrice : nos **commerces sont des OBJETS**. Pour que l'œil tombe d'abord sur eux, il
faut des **surfaces calmes**, des **lignes qui guident**, **aucun objet parasite** (POI Mapbox), et un
**texte discret**. Le premier objet fort rencontré doit être **un marqueur**.

**La question permanente**, à chaque couche : *cette couche aide-t-elle à découvrir un commerce ?*
Si non → **elle recule.**

**La hiérarchie du regard à obtenir** : `1. les commerces → 2. le quartier → 3. le territoire`
(jamais l'inverse).

---

## 1. La distribution (les 6 personnages)

| Couche (famille Mapbox) | Registre | Rôle | Importance | Visibilité cible |
|---|---|---|---|---|
| **Eau** (`water`, `waterway`) | surface | repère qui oriente | moyenne | présente, calme, jamais « piscine » |
| **Parcs / végétation** (`landuse`, `park`) | surface | fraîcheur, respiration | moyenne | douce, en 3 couches |
| **Bâtiments** (`building`) | surface | texture du bâti, prépare la 3D | basse | très discrète (2D) |
| **Routes** (`road`) | ligne | **guider** | haute (structurante) | axes nets, secondaire effacé |
| **Labels** (`place-label`, `road-label`, `water-label`) | texte | orienter/nommer | basse-moyenne | hiérarchisés, halo crème |
| **POI** (`poi-label`) | objet | *(concurrent des marqueurs)* | **à neutraliser** | quasi nul (sauf repères curatés) |

---

## 2. Fiches personnage (une par couche)

Chaque fiche : *état actuel · objectif · modification · justification cognitive · impact attendu ·
vérification terrain*, plus « si on réduit le contraste » / « si on la supprime » (test d'existence).

### 2.1 — Eau · `water` / `waterway`
- **Pourquoi existe-t-elle ?** Le Lez, le Verdanson, les canaux : des **repères** naturels qui
  orientent sans texte.
- **État actuel** (Streets v12) : bleu vif « touristique », aplat plat qui capte l'œil.
- **Objectif** : un repère **calme** qui guide le regard le long de son cours, sans rivaliser.
- **Modification** : fill `#A9C7C4` (eau sauge-ardoise) ; contour/`waterway` `#8FB3AF` un peu plus
  dense pour lire les cours d'eau fins ; retirer toute saturation bleue.
- **Justification cognitive** : c'est une **surface** (lue en 1ᵉ) → basse saturation pour qu'elle
  s'installe sans capturer ; sa forme allongée **guide** naturellement l'œil (Gestalt : continuité).
- **Impact attendu** : on « sent » l'eau, on s'oriente avec, mais on ne la **regarde** pas.
- **Si on réduit le contraste** : on perd le repère d'orientation → l'utilisateur se situe moins bien.
- **Si on la supprime** : la ville perd son squelette naturel (fleuve/canaux) → désorientation.
- **Vérifier terrain** : près du Lez, « peux-tu suivre la rivière des yeux sans effort ? » (oui = ok).

### 2.2 — Parcs / végétation · `landuse` (park, grass, wood)
- **Pourquoi existe-t-elle ?** Évoquer la **promenade, la fraîcheur** — l'envie de flâner.
- **État actuel** : vert unique, plat, parfois criard.
- **Objectif** : une végétation qui **respire**, en profondeur, jamais dominante.
- **Modification** : 3 couches — parc `#CDD9B4`, frondaison `#BACB9F`, prairie `#D6DFBF` (tokens STYLE
  §3.2). Verts **sauge chauds**, désaturés.
- **Justification cognitive** : surface (lue en 1ᵉ) → doit reculer ; mais la **variation douce** de
  vert crée une texture agréable (richesse sans bruit).
- **Impact attendu** : les parcs donnent envie de s'y poser, sans voler la vedette aux marqueurs.
- **Si on réduit le contraste** : les parcs se fondent dans le sol → on perd les poumons verts (les
  lieux de balade que YOOTOO veut valoriser).
- **Si on la supprime** : la carte devient minérale, sans invitation à la détente.
- **Vérifier terrain** : au Peyrou, note *Envie d'explorer/détente* ; « donne-t-il envie de s'asseoir ? ».

### 2.3 — Bâtiments · `building`
- **Pourquoi existe-t-elle ?** Donner la **texture du bâti** (on est en ville), préparer la 3D.
- **État actuel** : gris froids, parfois trop présents au zoom rue.
- **Objectif** : un bâti **chaud et discret** qui structure sans distraire ; prêt pour l'extrusion 2→3D.
- **Modification** : fill `#ECE3D2`, outline `#E0D5C0`, opacité modérée ; **extrusion désactivée**
  (2D d'abord) mais couche prête ; ombre cohérente (lumière **haut-gauche**).
- **Justification cognitive** : surface (lue en 1ᵉ) → recule ; l'outline fin donne la **lecture des
  îlots** (lignes implicites) utile à l'orientation, sans crier.
- **Impact attendu** : on sait qu'on est « dans la ville » ; le bâti soutient, ne concurrence pas.
- **Si on réduit le contraste** : à l'extrême, la ville « s'aplatit » → on perd le sens des îlots/rues.
- **Si on la supprime** : plus de tissu urbain → la carte paraît vide/abstraite en centre dense.
- **Vérifier terrain** : en Écusson, « les bâtiments t'aident-ils à te repérer sans t'accaparer ? ».

### 2.4 — Routes · `road` (primary/secondary/tertiary/path)
- **Pourquoi existe-t-elle ?** **Guider** — c'est le rôle noble de la voirie ici.
- **État actuel** : jaunes/oranges vifs, casings marqués, hiérarchie tape-à-l'œil → **bruit**.
- **Objectif** : une hiérarchie **extrêmement lisible** : les grands axes guident, le secondaire
  **disparaît progressivement**.
- **Modification** :
  - Primaire : fill `#FFFDF8` + casing chaud `#E7DAC0` → visible à tous les zooms.
  - Secondaire : `#F6F1E6`, **sans casing**, apparaît au zoom quartier.
  - Tertiaire/résidentiel : `#F1ECE0`, opacité **montant avec le zoom** (quasi invisible de loin).
  - Sentiers/berges : `#E9D9BE` pointillé (invitation à marcher).
  - **Supprimer** les casings vifs et les couleurs de classe (motorway jaune, etc.).
- **Justification cognitive** : ce sont des **lignes** (lues en 2ᵉ) → parfaites pour **guider** l'œil ;
  réduire le contraste du secondaire = réduire le **bruit** pour laisser émerger les objets (marqueurs).
- **Impact attendu** : le regard suit les axes vers les zones de commerces, sans être happé par un
  entrelacs de rues.
- **Si on réduit le contraste** (secondaire) : gain net de calme ; **attention** à garder les
  **primaires** lisibles (sinon on perd le guidage structurant).
- **Si on la supprime** (toute la voirie) : plus de guidage ni d'échelle → on ne sait plus « comment
  y aller ».
- **Vérifier terrain** : « suis l'axe principal jusqu'à un commerce » — est-ce évident ? (oui = ok).

### 2.5 — Labels · `place-label`, `road-label`, `water-label`
- **Pourquoi existe-t-elle ?** **Nommer** juste ce qu'il faut pour s'orienter.
- **État actuel** : hiérarchie faible, halos blancs durs, villes/quartiers/rues se marchent dessus.
- **Objectif** : une hiérarchie **très claire** : ville → quartier → rue ; **jamais** l'inverse.
- **Modification** :
  - Ville : plus grand, `#3A3931`, léger interlettrage, halo crème `#F3EEE2`.
  - Quartier : moyen, `#3A3931` atténué.
  - Rue : petit, `#89836F`.
  - Hydronymes : `#5E8B86` (le nom « guide » vers l'eau).
  - **Aucun label ne titre plus fort que la ville en vue large.** Le **commerce n'est jamais un label
    de fond** (il vit dans la couche marqueurs).
- **Justification cognitive** : le **texte** est lu en **dernier** → il ne doit jamais capter en
  premier ; une échelle typographique nette = orientation sans lecture laborieuse.
- **Impact attendu** : on se situe d'un coup d'œil ; le texte accompagne, ne domine pas.
- **Si on réduit le contraste** : moins d'ancrage → risque de perte de repère (surtout au soleil).
- **Si on la supprime** : plus de noms → on ne sait plus **où** l'on est (échec du critère orientation).
- **Vérifier terrain** : sonde 3 s → « quel quartier ? quelle grande rue ? » réponds sans chercher.

### 2.6 — POI · `poi-label` (générique Mapbox)
- **Pourquoi existe-t-elle ?** …Elle **ne devrait pas**, pour YOOTOO : ce sont des **objets
  concurrents** de nos marqueurs (la base de données Mapbox, pas le territoire).
- **État actuel** : des **centaines** d'icônes/labels génériques → bruit d'objets, concurrence directe.
- **Objectif** : que **le seul objet fort de la carte soit un marqueur YOOTOO**.
- **Modification** : **désactiver** les couches `poi-label` génériques. **Ne garder** que : grands
  parcs (repère de balade) et **monuments repères curatés** (Comédie, Cathédrale, Peyrou, Gare,
  Halles…), en picto **sobre** + label discret, densité très basse, aux bons seuils de zoom.
- **Justification cognitive** : deux objets forts en compétition = l'œil se disperse ; en **retirant**
  les POI, on rend nos marqueurs **saillants** (pop-out pré-attentif). *Retirer, c'est révéler.*
- **Impact attendu** : les commerces deviennent **les acteurs principaux** ; la carte raconte le
  **territoire**, pas la base Mapbox.
- **Si on réduit le contraste** (au lieu de supprimer) : mieux, mais le bruit résiduel dilue encore
  les marqueurs → **supprimer** est supérieur ici.
- **Si on la supprime** : exactement l'objectif. Seul risque : perdre un repère utile → compensé par
  les **monuments curatés**.
- **Vérifier terrain** : ouverture à froid → « quel est le premier point qui attire ton œil ? »
  L'idéal : **un marqueur**, jamais un POI Mapbox.

---

## 3. Ordre d'exécution dans Studio

1. Base **Light/vierge** → sol `#F3EEE2`.
2. **Eau** (2.1) → **Parcs** (2.2) → **Bâtiments** (2.3) : les surfaces reculent d'abord.
3. **Routes** (2.4) : recolorer par classe, retirer casings vifs, régler l'opacité par zoom.
4. **POI** (2.6) : **désactiver** le générique ; activer la couche monuments curatés.
5. **Labels** (2.5) : échelle ville→quartier→rue, halos crème.
6. **Export** → `EXPO_PUBLIC_MAPBOX_STYLE_URL` (aucun code app : `config.ts` lit déjà la variable).

> On avance surface → ligne → objet → texte : **le même ordre que le cerveau**. On construit la
> hiérarchie dans le sens où elle sera lue.

---

## 4. Critère de validation (S1 réussi UNIQUEMENT si)

- le **regard va d'abord vers les commerces** ;
- le **territoire reste immédiatement reconnaissable** ;
- les **marqueurs semblent appartenir** naturellement à la carte (mêmes lumière/chaleur) ;
- le **fond accompagne sans jamais rivaliser** ;
- l'ensemble paraît **intemporel**.

Ce n'est pas une **identité graphique** qu'on vise, c'est une **identité perceptive** : c'est elle qui
fera reconnaître YOOTOO **sans logo**. Protocole de vérification : sessions de
[FIELD_OBSERVATION](./FIELD_OBSERVATION.md) (surtout *première utilisation*, *plein soleil*,
*centre historique*) + la sonde des 3 secondes.

> Objectif final : qu'en refermant l'app, l'utilisateur ne dise pas « quelle belle carte », mais
> **« j'ai découvert un endroit où je vais revenir. »**

---

## 5. Ce que je ne peux pas faire à ta place (honnêteté)

Créer le style se fait **dans Mapbox Studio**, sur **ton compte** (le style est un artefact hébergé,
pas du code). Ma part : ce guide, les **valeurs cibles** (tokens), la **justification** de chaque
couche, et le **critère** de validation. **Ta part** : exécuter dans Studio, exporter, coller l'URL,
puis **valider au terrain**. Aucune ligne de code applicatif à changer pour le style jour.
