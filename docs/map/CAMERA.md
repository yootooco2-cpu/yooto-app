# Cinematic Camera Engine — YOOTOO Map System

> **Statut : proposé — à valider avant tout code.** Les valeurs chiffrées sont des points de
> départ **calibrés**, à affiner sur la vraie carte (je ne peux pas juger le rendu web à ta place).

> La règle absolue : **la caméra doit être invisible.** Le succès n'est pas « quelle belle
> animation », c'est *« je ne sais pas pourquoi, mais cette carte est incroyablement agréable ».*
> Si l'utilisateur remarque la caméra, elle est déjà trop démonstrative.

Positionnement : Google Maps optimise la navigation, Apple la lisibilité. **YOOTOO optimise le
plaisir d'explorer.** La caméra est un **guide silencieux** : elle anticipe, elle accompagne,
elle ne devient jamais le spectacle.

---

## 1. Le pipeline (5 couches + 1 chef d'orchestre)

La logique métier **n'appelle jamais Mapbox**. Tout descend le pipeline, une seule couche parle à
Mapbox, un seul composant possède la caméra.

```
   Événements produit (sélection, recherche, recentrage, ouverture sheet, geste…)
                                   │
                                   ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │ 1. CAMERA CONTEXT   « que fait l'utilisateur, là, maintenant ? »       │  observation
   │    firstOpen · aroundMe · search · manualPan · merchantSelected ·      │  (fait, pas choix)
   │    sheetOpen · merchantNavigation · backToMap · autoZoom · recenter    │
   └──────────────────────────────────────────────────────────────────────┘
                                   │  (contexte → intention)
                                   ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │ 2. CAMERA INTENT    « quel résultat on veut ? » (abstrait, agnostique) │  sémantique
   │    reveal(bounds) · focus(coord) · follow(coord) · overview ·          │
   │    frameNeighborhood(coord) · shiftForSheet(insets) · none             │
   └──────────────────────────────────────────────────────────────────────┘
                                   │  + environnement (zoom courant, territoire, reduce-motion)
                                   ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │ 3. CAMERA STRATEGY  intent + env → PLAN concret (PURE)                 │  décision
   │    → CameraPose  { center, zoom, pitch, bearing, padding }            │  (hiérarchie zoom,
   │    → CameraMotion { primitive, duration, easing, curve }             │   règles de pitch)
   └──────────────────────────────────────────────────────────────────────┘
                                   │  (plan)
                                   ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │ 4. CAMERA SCHEDULER  possède la caméra : priorités, dead-zone,        │  arbitrage
   │    supersession, gestes prioritaires, interruption, reduce-motion     │  (machine à états)
   └──────────────────────────────────────────────────────────────────────┘
                                   │  (plan retenu, une seule anim à la fois)
                                   ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │ 5. MAPBOX CAMERA ADAPTER  seul appelant de map.easeTo/flyTo/jumpTo    │  exécution
   └──────────────────────────────────────────────────────────────────────┘
```

**Où vit chaque couche** (respecte l'[ARCHITECTURE](./ARCHITECTURE.md) — dépendances à sens unique) :

| Couche | Nature | Emplacement | Dépend de | Statut |
|---|---|---|---|---|
| Context | énumération + dérivation | `features/map/camera/types.ts` | rien | 🟡 câblage C6 |
| Intent | union sémantique | `features/map/camera/types.ts` | Design tokens | ✅ C2 |
| **Mood** | intention émotionnelle (pure) | `features/map/camera/mood.ts` | types | ✅ **C3** |
| **Strategy** | **fonction pure** | `features/map/camera/strategy.ts` | Mood, tokens, geo | ✅ **C3** |
| Scheduler | machine à états pure + horloge injectée | `features/map/camera/scheduler.ts` | Strategy, Adapter (injecté) | ⬜ C5 |
| Adapter | seul code Mapbox | `components/map/camera/mapboxCameraAdapter.ts` | mapbox-gl | ⬜ C4 |
| Tokens | valeurs | `design/tokens/camera.ts` | rien | ✅ C2 |

Invariant : **Intent → Mood → Strategy sont purs et testables** (aucun Mapbox, aucun DOM). Seul
l'Adapter touche Mapbox. Le Scheduler ne connaît Mapbox que via une interface injectée → testable.

### La couche Mood (✅ C3) — la caméra raisonne en émotions, jamais en pixels

Entre l'Intent (le *but*) et la Strategy (le *plan*), le **Mood** nomme l'**intention émotionnelle**.
`resolveMood(intent, context)` (pur) → un mood parmi **8** ; `resolveCameraPlan(intent, env)` choisit
la stratégie du mood et renvoie un `CameraPlan | null`. `null` = **la caméra se tait** (réponse pleine).

| Mood | Émotion | Problème UX résolu | Mouvement |
|---|---|---|---|
| **discover** | ouverture, invitation | « où suis-je, qu'y a-t-il ici ? » | fly, plan (recherche) / ville |
| **explore** | curiosité | comprendre la densité du quartier | ease decel, léger pitch |
| **focus** | attention, désir, intimité | isoler un lieu, donner envie d'y aller | ease decel, pitch immersif |
| **follow** | réassurance | me localiser | fly vers l'utilisateur |
| **return** | prise de recul douce | ne pas perdre le fil après la fiche | ease, léger dézoom |
| **browse** | continuité fluide | comparer sans re-vol à chaque fiche | ease decel court |
| **adjust** | *aucune* (imperceptible) | garder le commerce au-dessus de la sheet | nudge (padding seul) |
| **rest** | respect | **ne jamais lutter contre un geste** | *rien* (plan `null`) |

Le `CameraPlan` porte désormais `{ pose, motion, priority, mood, reason? }` — aucun détail Mapbox.
La **priorité** dépend du *déclencheur* (`user > explicit > navigation > auto`), pas de l'émotion.

---

## 2. Contextes → Intents → Plan

Chaque contexte a **une** stratégie. Le padding « sheet-aware » = zone visible réduite par la
bottom sheet / le panneau Focus desktop (on cadre dans l'espace **réellement** visible).

| # | Contexte | Déclencheur | Intent | Niveau de zoom cible | Primitive | Priorité |
|---|---|---|---|---|---|---|
| 1 | **firstOpen** | montage carte, pas de caméra restaurée | `overview` | Ville | fly | AUTO |
| 1'| *restore* | `initialCamera` présent (session) | `none` (jump au setup) | — | jump | AUTO |
| 2 | **aroundMe** | 1er fix GPS / filtre « autour de moi » | `focus(user)` | Quartier | fly | EXPLICIT |
| 3 | **search** | résultats de recherche | `reveal(bounds résultats)` | Quartier↔Ville (fit) | fly | EXPLICIT |
| 4 | **manualPan** | geste pan/zoom/rotate | `none` (la caméra se tait) | — | — | USER |
| 5 | **merchantSelected** | tap marqueur / carte | `focus(commerce)` | Commerce sélectionné | ease | EXPLICIT |
| 6 | **sheetOpen** | bottom sheet monte / panneau Focus | `shiftForSheet(insets)` | inchangé (padding seul) | nudge | NAVIGATION |
| 7 | **merchantNavigation** | suivant/précédent dans la sheet | `focus(commerce)` | Commerce sélectionné | ease | NAVIGATION |
| 8 | **backToMap** | fermeture fiche/sheet | `overview` léger (dézoom doux) | Rue↔Quartier | ease | NAVIGATION |
| 9 | **autoZoom** | tap cluster | `reveal(bounds cluster)` | Rue↔Quartier (fit) | ease | AUTO |
| 10 | **recenter** | bouton « Me recentrer » | `focus(user)` | Rue | fly | EXPLICIT |

Notes de conception :
- **manualPan a la priorité absolue** : pendant un geste, aucune caméra automatique ne part. À la
  fin du geste, la caméra **reste où l'utilisateur l'a laissée** (jamais de snap-back).
- **merchantSelected** ne recadre pas si le commerce est **déjà bien visible** (dead-zone, §5) —
  on évite le « saut » quand on tape un marqueur déjà au centre.
- **sheetOpen** ne change **que le padding** (la carte glisse pour dégager le commerce au-dessus
  de la sheet) : pas de zoom, pas de pitch → mouvement quasi imperceptible mais « ça tombe juste ».

---

## 3. Hiérarchie de zoom (6 niveaux)

Chaque niveau porte **zoom, pitch, padding, primitive, durée, easing**. Valeurs de départ
(Montpellier ; zoom Mapbox 0–22) — **à calibrer**.

| Niveau | zoom | pitch | padding | primitive | durée | easing |
|---|---|---|---|---|---|---|
| **Territoire** | 9.5 | 0° | 48 | fly | 1200 ms | `cinematic` |
| **Ville** | 12.5 | 0° | 40 | fly | 1000 ms | `cinematic` |
| **Quartier** | 14.5 | 25° | 40 | fly / ease | 800 ms | `decel` |
| **Rue** | 16.0 | 35° | 32 | ease | 650 ms | `decel` |
| **Commerce** | 16.5 | 40° | sheet-aware | ease | 600 ms | `decel` |
| **Commerce sélectionné** | 17.5 | 45° | sheet-aware | ease | 650 ms | `decel` |

Principe : le **pitch augmente avec l'intimité**. Vue large = plane (on scanne, on lit) ; on
approche → la ville « se lève » doucement (on ressent la rue, on a envie d'y aller). Jamais de
pitch en vue large (illisible, gratuit).

---

## 4. Règles de pitch

Le pitch encode **le mode mental**, pas la performance graphique.

| Mode | Pitch | Justification |
|---|---|---|
| Recherche / vue d'ensemble | **0°** | on lit une liste sur une carte → planéité = lisibilité |
| Exploration (quartier/rue) | **25–35°** | légère perspective → sensation de « ville », envie d'entrer |
| Commerce sélectionné | **45°** | immersion : on est « devant » le lieu, pas au-dessus |
| Reduce Motion | **0°** (figé) | aucun basculement d'inclinaison |

**Modificateur territoire** (optionnel, désactivé par défaut) : le type de quartier ajuste
légèrement l'altitude. Centre historique dense → caméra un peu **plus basse** (zoom +0.3,
pitch +3°) pour ressentir les ruelles ; grand espace / résidentiel → un peu **plus haute**
(zoom −0.4, pitch −5°), rien à regarder en oblique.

> ⚠️ **Question ouverte (non tranchée) :** d'où vient le « type de quartier » ? Land-use Mapbox
> (`queryRenderedFeatures`, coût à mesurer) vs données YOOTOO. Tant que la source n'est pas
> décidée (phase Terrain/3D — Phase 2), le modificateur reste **off** : `TerritoryProfile = 'neutral'`.
> On ne code pas une détection inventée. → couplé à [DESIGN-SYSTEM §9 Terrain](./DESIGN-SYSTEM.md#9-chapitres-cadrés-à-figer-à-leur-phase--pas-de-spec-inventée).

---

## 5. États de caméra & machine à états

Quatre entrées possibles, **une seule anim à la fois**. Le Scheduler est l'unique propriétaire.

```
                 intent (prio ≥ courant)
        ┌──────────────────────────────────────────┐
        │                                           ▼
   ┌────────┐   intent      ┌───────────┐  complete/stop   ┌────────┐
   │  IDLE  │ ─────────────▶│ ANIMATING │ ────────────────▶│  IDLE  │
   └────────┘               └───────────┘                  └────────┘
        │  gesture start          │  gesture start (map.stop)
        ▼                         ▼
   ┌─────────────────────────────────────┐
   │            GESTURE                   │   la caméra se TAIT
   │  (l'utilisateur pilote ; auto = off) │
   └─────────────────────────────────────┘
        │  gesture end (moveend userInitiated)
        ▼
   ┌────────┐   reste EXACTEMENT où l'utilisateur a laissé la carte (jamais de snap-back)
   │  IDLE  │
   └────────┘
```

| État | Signification | Entrée | Sortie |
|---|---|---|---|
| **IDLE** | caméra au repos, prête | fin d'anim, fin de geste | intent → ANIMATING ; geste → GESTURE |
| **ANIMATING** | une transition en cours | intent accepté | fin naturelle → IDLE ; geste → GESTURE ; intent ≥ prio → ANIMATING (stop+start) |
| **GESTURE** | l'utilisateur pilote | `dragstart`/`zoomstart`/`rotatestart` | `moveend(userInitiated)` → IDLE |

Règles d'arbitrage dans **ANIMATING** :
- intent de **priorité ≥** courant → on **stoppe** l'anim en cours (`map.stop()`) et on démarre la
  nouvelle (supersession propre, jamais deux anims concurrentes).
- intent de **priorité <** courant → **ignoré** (l'auto ne coupe pas un geste explicite).

**Priorités** (du plus fort au plus faible) :

```
USER (geste)  >  EXPLICIT (tap, recentrer, recherche)  >  NAVIGATION (suivant/préc., retour)  >  AUTO (firstOpen, autoZoom, reveal)
```

---

## 6. Primitives de mouvement

| Primitive | Mapbox | Quand | Ressenti |
|---|---|---|---|
| **jump** | `jumpTo` (0 ms) | restore session, reduce-motion | instantané, aucune anim |
| **ease** | `easeTo` | même échelle / courte distance (sélection, retour, nav) | glissé, discret |
| **fly** | `flyTo` (courbe) | grand changement d'échelle / traversée ville | vol cinématographique |
| **nudge** | `easeTo` (padding seul) | ouverture sheet | imperceptible, « ça tombe juste » |

Règle : **fly** seulement quand l'échelle change beaucoup (sinon il « décolle » inutilement →
sensation de spectacle). Les micro-ajustements sont toujours **ease** ou **nudge**.

---

## 7. Transitions documentées

Chaque transition = durée · easing · justification cognitive · justification UX.

| Transition | Primitive | Durée | Easing | Justif. cognitive | Justif. UX |
|---|---|---|---|---|---|
| firstOpen → Ville | fly | 1000 ms | cinematic | pose le décor sans brusquer | « la ville s'ouvre », accueil |
| Ville → Quartier (recherche) | fly | 800 ms | decel | l'œil suit la décélération jusqu'à la cible | on arrive « posé » sur les résultats |
| Carte → Commerce sélectionné | ease | 600 ms | decel | courte distance = pas de vol spectaculaire | réponse immédiate au tap |
| Commerce → Commerce (nav) | ease | 550 ms | decel | continuité entre deux fiches voisines | feuilletage fluide, pas de re-vol |
| Ouverture sheet | nudge (padding) | 350 ms | gentle | changement minimal = non remarqué | le commerce reste visible au-dessus de la sheet |
| Retour carte (fermeture) | ease | 500 ms | standard | légère prise de recul = « je ressors » | rend le contrôle, dézoome à peine |
| Tap cluster → fit | ease | 600 ms | decel | l'éclatement se lit dans le mouvement | on comprend « ça se sépare en N » |
| Recentrage (bouton) | fly | 700 ms | decel | retour explicite demandé = mouvement assumé | confirme l'action de l'utilisateur |
| Reduce Motion (toutes) | jump | 0 ms | — | pas de mouvement du tout | respect strict de la préférence |

---

## 8. Design Tokens caméra (spec — à coder en PR-C2)

Source unique `src/design/tokens/camera.ts`. **Aucune valeur caméra en dur** ailleurs.

**Durées**
```
instant 0 · nudge 350 · short 550 · base 650 · medium 800 · long 1000 · epic 1200   (ms)
```
**Easing** (courbes appliquées via l'option `easing` d'`easeTo`, ou `curve/speed` pour `flyTo`)
```
standard  cubic-bezier(0.4, 0.0, 0.2, 1)     // in-out neutre (retour)
decel     cubic-bezier(0.16, 1.0, 0.3, 1)    // ease-out marqué : arrivées « posées »
gentle    cubic-bezier(0.25, 0.1, 0.25, 1)   // nudge quasi imperceptible
cinematic flyTo { curve: 1.42, speed: 1.2 }  // vol large, courbe naturelle
```
**Zoom / Pitch / Padding par niveau** → la table du §3, extraite en `CAMERA_LEVELS`.

**Modificateurs territoire** (défaut `neutral` = 0)
```
historic { zoom +0.3, pitch +3 } · open { zoom -0.4, pitch -5 } · neutral { 0, 0 }
```
**Seuils du Scheduler**
```
DEAD_ZONE   center 15 m · zoom 0.05 · pitch 1° · bearing 1°   // en-deçà → on ne bouge pas
COALESCE    120 ms (debounce trailing des intents rapides, ex. hover)
```

---

## 9. Performances

- **Un seul propriétaire** (Scheduler) → jamais deux `easeTo`/`flyTo` concurrents.
- **Dead-zone** : si la pose cible ≈ pose courante (seuils ci-dessus) → **aucun appel** caméra.
  Élimine le tremblement (« ne tremble jamais ») et les recadrages inutiles.
- **Coalescing** : les intents rapprochés (survol, frappe) sont regroupés (trailing 120 ms) →
  une seule anim au lieu d'une rafale.
- **Gestes prioritaires** : `dragstart/zoomstart/rotatestart` → `map.stop()` immédiat + état GESTURE ;
  aucune caméra auto ne repart avant `moveend(userInitiated)`.
- **Aucun recalcul lourd dans une boucle** : la Strategy est pure et appelée **à l'événement**,
  pas par frame. Mapbox anime seul (pas de rAF maison).
- **Réconciliation viewport** : la persistance de viewport existante (`onViewportChange`,
  `mapViewportStore`) reste la source au repos ; le Scheduler n'écrit jamais pendant un geste.

---

## 10. Accessibilité

- **Reduce Motion** (`prefers-reduced-motion: reduce`) → toutes les primitives deviennent **jump**
  (0 ms) ; pitch figé à 0° ; aucune courbe de vol.
- **Interaction prioritaire** : un geste **interrompt** toujours une anim en cours, sans délai.
- **Interruptible** : toute anim peut être stoppée (geste ou intent ≥ prio) — jamais « bloquante ».
- **Pas de rotation gratuite** : bearing reste à 0° sauf besoin explicite (aucune rotation
  automatique — désorientant).

---

## 11. Intégration avec l'existant

Aujourd'hui (`MapEngine.web.tsx`), la caméra est pilotée **en direct**, à 3 endroits :
`flyTo` user au 1er fix (z14/900 ms), `flyTo` recenter (z15/700 ms), setup/`initialCamera` au montage.
Pas de pitch, pas de caméra à la sélection, pas d'arbitrage gestes.

Le Camera Engine **remplace ces appels ad hoc** par des **intents** passés au Scheduler. Les props
existantes (`recenterToken`, `initialCamera`, `onViewportChange(userInitiated)`) deviennent des
**sources d'intents** — aucun changement d'API écran. Le retrofit est progressif (PRs ci-dessous),
chaque étape isolée et réversible ; on peut router un contexte à la fois derrière un flag.

---

## 12. Plan d'implémentation (petites PR)

Chacune : une responsabilité, réversible, `tsc` + tests verts, revue visuelle avant merge. **Aucun
code avant validation de cette architecture.**

| PR | Portée | Testable |
|---|---|---|
| **PR-C1** ✅ | *cette doc* + [ADR-007](./adr/README.md) | revue |
| **PR-C2** ✅ | Tokens `design/tokens/camera.ts` + types purs (`CameraPose`, `CameraMotion`, `CameraContext`, `CameraIntent`) | unit |
| **PR-C3** ✅ | **Mood** (`mood.ts`) + **Strategy pure** `resolveCameraPlan(intent, env) → CameraPlan\|null` + geo mercator (`geo.ts`) | unit (cœur) |
| **PR-C4** | **Adapter Mapbox** `applyCameraPlan(driver, plan)` — seul appelant `easeTo/flyTo/jumpTo` | contrat (driver mock) |
| **PR-C5** | **Scheduler** + machine à états (priorités, dead-zone, coalescing, gestes, interruption) — horloge & driver injectés | unit (machine) |
| **PR-C6** | **Câblage** : router `initialCamera` / recenter / firstOpen / sélection via le Scheduler ; retirer les `flyTo` ad hoc | intégration + revue |
| **PR-C7** | **Contextes fins** : nudge sheet, navigation entre commerces, retour carte, autoZoom cluster | revue |
| **PR-C8** *(opt.)* | Modificateur territoire (si/quand la source de données est décidée — Phase 2) | unit |

---

## 13. Questions ouvertes (à trancher, non inventées)

1. **Source du « type de quartier »** (modificateur territoire) — land-use Mapbox vs données YOOTOO.
   Bloque PR-C8 uniquement ; le reste n'en dépend pas (défaut `neutral`).
2. **Valeurs à calibrer** sur la vraie carte : zoom/pitch par niveau, durées, seuil dead-zone
   (surtout le seuil « center 15 m » selon la densité de Montpellier).
3. **Bearing** : figé à 0° pour l'instant. Faut-il un jour orienter la caméra dans le sens d'un
   parcours (Phase parcours) ? → futur ADR si oui.
4. **Sheet insets** : valeur exacte du padding sheet-aware (dépend des paliers `@gorhom/bottom-sheet`
   et de la largeur du panneau Focus desktop) — à mesurer au câblage PR-C7.
```
