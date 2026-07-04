# ADR — Architecture Decision Records (Map System)

Chaque décision structurante est tracée : **contexte → décision → conséquences**. On ne revient pas
sur une décision sans un **nouvel ADR** qui l'annule (statut `Remplacé par ADR-xxx`).

Statuts : `Accepté` · `Proposé` · `Remplacé` · `Déprécié`.

---

## ADR-001 — Rendu Mapbox GL JS, web d'abord ; natif = placeholder
**Statut :** Accepté

**Contexte.** La carte est rendue par **Mapbox GL JS** (`MapEngine.web.tsx`). Sur natif iOS/Android,
il n'y a pas de vraie carte (`MapPlaceholder`). Un vrai rendu natif imposerait `@rnmapbox/maps`
(intégration lourde, build EAS, gestion de style dupliqué).

**Décision.** Le YOOTOO Map System se déploie **web-first**. Le natif reste un placeholder jusqu'à un
investissement natif décidé explicitement. On préserve le **contrat provider-agnostique**
(`features/map/types.ts` : `MapEngineProps`, `MapMarker`) pour garder la porte ouverte sans refonte
des écrans.

**Conséquences.** Toute la Vision Map se matérialise d'abord **sur web/desktop**. Les specs (marqueurs,
caméra, 3D) ciblent Mapbox GL JS. Le natif ne régresse pas (placeholder inchangé).

---

## ADR-002 — Jamais de `transform` sur un marqueur
**Statut :** Accepté

**Contexte.** Mapbox positionne chaque marqueur HTML **via `element.style.transform`**. Y écrire nous-
mêmes (ex. `scale`) casse la position (traînée/décalage).

**Décision.** La mise en avant d'un marqueur passe **uniquement** par `border`, `box-shadow` (anneau +
halo), **taille** (width/height fixées à la création) et `z-index`. Toute animation de type « pop »
s'exécute sur un **élément interne** (`.photo`), jamais sur le marqueur lui-même.

**Conséquences.** Le pop de sélection anime `.photo`. Les tailles d'état sont fixées au `sync` (pas de
resize dynamique → pas de re-centrage Mapbox). Performances préservées.

---

## ADR-003 — Une seule source de tri éditorial
**Statut :** Accepté

**Contexte.** Des pipelines parallèles existaient : `buildHomeSections` pré-filtrait via
`recommendCached(limit 24)` (pertinence) → l'Accueil remontait des traiteurs absents du top éditorial ;
Commerçants n'appliquait aucune diversification (mur de domaines). Écart entre le moteur et le rendu.

**Décision.** **`rankMerchantsEditorially`** (fondé sur `getMerchantEditorialScore`) est la **source de
vérité unique** du classement, utilisée **identiquement** par `buildHomeSections` (Accueil) et
`useMerchantSearch` (Carte + Commerçants). Le score combine, dans cet ordre : mission/tier
(`resolveTier`) → qualité de fiche → qualité visuelle → note → tri stable. Aucun pré-filtre parallèle.

**Conséquences.** Cohérence inter-écrans. La diversification (`editorialDiversification`, round-robin
par famille, bande d'excellence) s'applique **par-dessus** ce tri, uniquement sur les premières cartes.
Aucun commerce supprimé ; le classement profond reste l'ordre éditorial exact.

---

## ADR-004 — Quatre états de marqueur, pas davantage
**Statut :** Accepté

**Contexte.** La multiplication d'états (nouveau, favori, pointillé, premium…) crée de la complexité
visuelle et cognitive.

**Décision.** **Quatre états** couvrent le besoin : `Standard`, `Recommandé`, `Exceptionnel`,
`Sélectionné`. Tout nouveau besoin doit se ramener à l'un d'eux ou justifier un ADR dédié.

**Conséquences.** Système mémorisable et calme. « Favori » et « nouveau » sont différés (ils
nécessiteraient un store persistant et risqueraient le bruit) ; ré-évaluables via un futur ADR.

---

## ADR-005 — Langage des couleurs par catégorie (+ exceptionnel en or)
**Statut :** Accepté

**Contexte.** Des couleurs « jolies » mais trop proches n'aident pas la reconnaissance. Le rouge de
certaines catégories, sur l'état « exceptionnel », évoquait l'alerte plutôt que le précieux.

**Décision.** La couleur d'un commerce = sa **catégorie** (dérivée du cryptogramme), avec une palette
**distincte et mémorisable** (cf. [Design System §4](../DESIGN-SYSTEM.md#4-langage-des-couleurs-)).
L'état **Exceptionnel** utilise une **aura or/champagne fixe** (précieux), l'anneau conservant la teinte
catégorie. Ces valeurs seront **tokenisées** (`src/design/tokens/`) pour que `photoMarkers.ts` ne code
plus de valeurs en dur.

**Conséquences.** Reconnaissance pré-attentive. Point d'extraction de tokens à réaliser en phase Design
Tokens (dette évitée : une seule source de couleurs pour la carte).

---

## ADR-006 — Couleur du CADRE distincte du badge cryptogramme
**Statut :** Accepté

**Contexte.** Le cryptogramme porte déjà une couleur (`cryptogramColor`, dans `cryptograms.ts`),
pensée pour un **pictogramme blanc sur pastille**. Réutiliser ces teintes telles quelles pour
l'anneau/halo des marqueurs donnait des couleurs proches, peu mémorisables (cf. ADR-005), et
mélangeait deux rôles : *identité pictogramme* vs *langage de reconnaissance de catégorie*.

**Décision.** Le marqueur a **deux rôles couleur séparés** : (1) le **badge** garde la couleur
du cryptogramme (identité) ; (2) le **cadre** (anneau + halo) suit un **langage de couleurs
dédié**, tokenisé dans `src/design/tokens/mapMarkers.ts` (`MAP_COLOR_LANGUAGE`, `mapColorFor`),
ancré sur la charte §4 (vert sauge, terracotta, bordeaux…). Total sur les cryptogrammes connus
+ **repli neutre premium** → un marqueur ne retombe jamais par hasard sur une teinte étrangère.
Passe la règle absolue : Cognition (teintes distinctes = reconnaître sans lire), Identité (palette
YOOTOO), Évolutivité (source unique, `photoMarkers` ne code plus aucune couleur en dur).

**Conséquences.** Deux sources de couleur coexistent **par intention**, chacune avec son rôle
documenté. Le badge et le cadre peuvent diverger sur une catégorie sans incohérence. Toute
évolution de teinte de marqueur se fait dans `mapMarkers.ts` uniquement.

**Alternatives écartées.** Réutiliser `cryptogramColor` pour le cadre (couleurs trop proches,
rôle mélangé) ; une palette par état plutôt que par catégorie (casse la reconnaissance).

---

## ADR-007 — Cinematic Camera Engine : pipeline en couches, un seul propriétaire
**Statut :** Accepté (architecture) — implémentation par étapes (PR-C2…C7)

**Contexte.** La caméra est aujourd'hui pilotée **en direct** dans `MapEngine.web.tsx` (trois
`flyTo`/setup ad hoc), sans pitch, sans caméra à la sélection, sans arbitrage des gestes. Ajouter
la caméra contextuelle « à la main » multiplierait les appels Mapbox dispersés → sauts, tremblements,
animations concurrentes, conflits avec les gestes = exactement ce que la règle absolue interdit.

**Décision.** Un **Camera Engine en 5 couches** : `Context → Intent → Strategy → Scheduler → Adapter`.
- La **logique métier n'appelle jamais Mapbox** : elle émet des **intents** sémantiques.
- La **Strategy est pure** (intent + environnement → plan `{pose, motion}`) : hiérarchie de zoom,
  règles de pitch, reduce-motion. Testable sans carte.
- Un **Scheduler unique possède la caméra** : priorités (`USER > EXPLICIT > NAVIGATION > AUTO`),
  **dead-zone** (pas de mouvement sous les seuils → jamais de tremblement), **coalescing**,
  **gestes prioritaires** (interruption immédiate, jamais de snap-back), **une seule anim à la fois**.
- Un **seul Adapter** appelle `easeTo/flyTo/jumpTo` (injecté dans le Scheduler → testable via mock).

Passe la règle absolue : Vision (guide silencieux du plaisir d'explorer) · Cognition (mouvements
justes, jamais remarqués) · Performance (0 anim concurrente, dead-zone, coalescing) · Identité
(pitch/durées/easing = signature YOOTOO, tokenisés) · Évolutivité (couches indépendantes, retrofit
progressif sans changer l'API écran).

**Conséquences.** Toute évolution caméra = un intent + une règle de Strategy (pas un `flyTo` de plus).
Les valeurs vivent dans `design/tokens/camera.ts`. Le natif (placeholder) et un futur provider
peuvent réutiliser Context/Intent/Strategy (purs) et n'implémenter que l'Adapter. → [CAMERA.md](../CAMERA.md).

**Alternatives écartées.** Piloter la caméra directement depuis les écrans/`MapEngine` (dispersion,
sauts, conflits gestes) ; une lib de caméra tierce (perte de contrôle sur le ressenti, dépendance).

---

## ADR-008 — Le Scheduler arbitre ; la Strategy décide ; l'Adapter reste idiot
**Statut :** Accepté

**Contexte.** La Strategy (ADR-007) sait produire un *bon* plan. Mais plusieurs sources émettent des
plans **quasi simultanément** (recherche, sheet, sélection, GPS, retour fiche, Discovery) et
l'utilisateur peut toucher la carte à tout instant. Sans arbitre : double animation, triple zoom,
rebonds, et surtout la caméra qui *lutte* contre le geste — exactement ce que la règle absolue interdit.
Une bonne caméra tient autant à ses **décisions** qu'à ses animations.

**Décision.** Trois responsabilités **séparées** :
- **Strategy** (pure) *décide quoi* : intent → `CameraPlan`. Ne sait rien de la concurrence ni du temps.
- **Scheduler** (pur, `scheduler.ts`) *arbitre quand* : reçoit des plans et répond **maintenant /
  plus tard / jamais**. Il porte : priorité **utilisateur absolue** (un geste interrompt tout, rien
  ne re-part), **coalescing** (fusion des demandes rapprochées → un seul mouvement), **dead-zone**
  (on ne lance pas un mouvement inutile), **file à une place** (le meilleur plan, pas de starvation),
  **reduce-motion** forcé. Machine à états simple et **100 % testable** : le temps et l'exécution
  sont **injectés** (`SchedulerTimer`, `CameraDriver`).
- **Adapter** (C4) *exécute bêtement* : traduit un plan en `easeTo/flyTo/jumpTo`. **Aucune décision** :
  il ne connaît ni priorité, ni file, ni gestes. Idiot par conception → interchangeable, testable via mock.

Passe la règle absolue : Vision (la caméra « pense avant d'agir ») · Cognition (elle évite les
mouvements parasites) · Performance (0 anim concurrente, dead-zone) · Identité (arbitrage = signature) ·
Évolutivité (Scheduler indépendant du provider ; l'Adapter se remplace sans toucher l'arbitrage).

**Conséquences.** La logique la plus sensible (l'arbitrage) vit dans une unité pure, testée sur les cas
durs (préemption, fusion, starvation, interruption, anti-spam). « La meilleure animation est celle que
le Scheduler a décidé de ne jamais lancer. » L'Adapter, resté idiot, ne peut pas introduire de dette
de décision.

**Alternatives écartées.** Fusionner arbitrage + exécution dans l'Adapter (Adapter « intelligent » →
Mapbox difficile à mocker, logique non testable) ; mettre l'arbitrage dans la Strategy (elle devrait
connaître le temps, la concurrence et l'état courant → plus pure).

---

## ADR-009 — Rendering Bridge : la frontière SDK, idiote et remplaçable
**Statut :** Accepté

**Contexte.** C'est ici que beaucoup d'architectures se dégradent : la couche qui parle au SDK finit
par accumuler des décisions (UX, ranking, priorités) « parce que c'est pratique », et le produit se
retrouve *soudé* à Mapbox. On veut l'inverse : Mapbox = simple fournisseur de rendu, remplaçable.

**Décision.** Un **Rendering Bridge** (`components/map/camera/mapboxCameraBridge.ts`) implémente le
port **`CameraDriver`** (`features/map/camera/driver.ts`) et **traduit** un `CameraPlan` en appels SDK
(`jumpTo`/`easeTo`/`flyTo`/`stop`, `getPose`). C'est le **seul** fichier de l'app qui connaît Mapbox
pour la caméra.
- Il **ne connaît jamais** : CameraIntent, Mood, Discovery, ranking, Merchant, Scheduler, priorités,
  UX, bottom sheet, catégories, Design System (au-delà des tokens de motion qu'il *traduit*).
- **Interdits absolus** : `if (intent)`, `if (mood)`, `if (priority)`, `if (merchant)`, `if (category)`,
  tout calcul UX/Discovery. Le jour où l'un apparaît, c'est une **régression d'architecture**.
- **Capacités** exposées (`CameraCapabilities` : pitch/bearing/terrain/globe/free-camera) → l'amont
  peut interroger le moteur sans le connaître ; brancher demain Apple Maps / Vision Pro / un autre SDK
  ne touche **que** ce fichier.
- Traductions **pures et testées** (`poseToCameraOptions`, `motionToAnimationOptions`, easing
  cubic-bezier) → l'easing token (chaîne CSS) devient une fonction pour le SDK. Erreurs SDK absorbées
  (le pipeline ne se bloque jamais).

Passe la règle absolue : Vision (produit *au-dessus* du SDK) · Cognition (n/a, zéro décision) ·
Performance (traduction directe, aucun calcul) · Identité (les tokens de motion pilotent le rendu) ·
Évolutivité (**remplacer Mapbox = réécrire ce seul fichier, puis recompiler**).

**Conséquences.** « Le fichier le plus ennuyeux de la base », et c'est un compliment : un bon Bridge
ne réfléchit jamais, il traduit parfaitement. La colonne vertébrale spatiale YOOTOO est complète :
Discovery → Camera (Strategy/Scheduler) → **Bridge** → SDK. Les innovations futures (3D, lumière,
caméra contextuelle, saisons) se branchent au-dessus sans casser l'architecture.

**Alternatives écartées.** Appeler Mapbox directement depuis le Scheduler ou les écrans (couplage,
non testable, dette de décision inévitable) ; un Adapter « intelligent » qui optimise/décide (rend le
SDK non interchangeable).

---

## ADR-000 — Template

```
## ADR-00X — Titre court à l'impératif
**Statut :** Proposé | Accepté | Remplacé par ADR-xxx | Déprécié

**Contexte.** Le problème, les forces en présence, ce qui pousse à décider maintenant.

**Décision.** Ce qu'on choisit, formulé sans ambiguïté. Passe-t-il la règle absolue
(Vision / Cognition / Perf / Identité / Évolutivité) ? En quoi ?

**Conséquences.** Ce que ça implique (positif ET négatif), ce que ça ferme, ce que ça ouvre.

**Alternatives écartées.** Et pourquoi.
```
