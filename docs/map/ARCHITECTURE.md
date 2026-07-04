# Architecture — YOOTOO Map System

Trois couches, une règle : **les dépendances ne vont que dans un sens.**

```
        Écran (explore.tsx, index.tsx, merchants.tsx)
                 │  compose les trois couches
     ┌───────────┼───────────────┐
     ▼           ▼               ▼
 Discovery ── Map Engine ── Design System
 (qui/quand)  (comment)      (quoi)
```

- **Design System** ne dépend de **rien** (tokens purs : couleurs, tailles, ombres, motion).
- **Map Engine** dépend du **Design System** (tokens) — jamais du Discovery.
- **Discovery Engine** ne dépend **ni** du Map Engine **ni** du DOM/Mapbox (logique pure).
- L'**écran** est le seul point qui **compose** les trois (il connaît React, Mapbox et le domaine).

Interdits (préviennent la dette) :
- ❌ Discovery qui importe `mapbox-gl` ou un composant React.
- ❌ Map Engine qui importe le ranking (`rankMerchantsEditorially`, `editorialScore`).
- ❌ Design System qui importe quoi que ce soit de `features/`.

---

## Design System

**Où** : `src/design/tokens/` (`colors`, `radii`, `shadows`, `spacing`, `typography`) + ce dossier `docs/map/`.

**Rôle** : la vérité *visuelle et cognitive*. Aucune logique, aucun rendu. Des **valeurs** et des
**règles**. Le langage des couleurs de la carte (10 catégories) et les 4 états de marqueur y sont
définis comme **tokens**, consommés par le Map Engine.

**Cible technique (Phase Design Tokens)** : extraire un token `mapColorLanguage` (cryptogramme →
teinte) et `markerStateTokens` (taille/anneau/halo/ombre par état) dans `src/design/tokens/`, pour
que `photoMarkers.ts` ne code plus de valeurs en dur. → voir [ADR-005](./adr/README.md).

---

## Map Engine

**Où** : `src/features/map/` (modèle + état, agnostique du provider) et `src/components/map/`
(rendu Mapbox GL JS web).

**Rôle** : *le comment*. Transforme des `MapMarker` génériques en carte vivante. Ne connaît **pas**
le type `Merchant` (adapter `merchantsToMapMarkers`) ni le ranking.

**Séparation rendu / logique déjà en place** (à préserver et étendre) :
- **Logique pure & testée** : `viewport.ts` (`isPlausibleViewport`), `mapViewportStore.ts`,
  `cluster/photoSelection.ts` (`photoPriority`, `selectPhotoMarkers`). Aucune dépendance carte/RN → testables.
- **Rendu** : `MapEngine.web.tsx` (cycle de vie Mapbox), `cluster/clusterController.ts`
  (clusters + user marker), `cluster/photoMarkers.ts` (pool borné de marqueurs photo HTML).
- **Contrat provider-agnostique** : `features/map/types.ts` (`MapEngineProps`, `MapMarker`) — permet
  demain `@rnmapbox/maps` (natif) ou un placeholder sans toucher les écrans.

**Contraintes structurantes** (voir ADR) :
- **Web only** aujourd'hui ; natif = `MapPlaceholder`. → [ADR-001](./adr/README.md).
- **Jamais `el.style.transform`** sur un marqueur (Mapbox y stocke la position). → [ADR-002](./adr/README.md).
- **Pool borné** de marqueurs photo (≤ 140) ; tout le reste porté par les couches GL (clusters). → [Performances](./DESIGN-SYSTEM.md#performances).

**Prochaines briques Map Engine** (chacune = phase + ADR) :
`markerState(merchant, ctx)` pur · caméra contextuelle (Phase 4) · apparition éditoriale (Phase 5) ·
terrain/3D (Phase 2) · thèmes clair/sombre du style Mapbox (Phase 1).

---

## Discovery Engine

**Où** : `src/features/discovery/` (logique **pure**, testée, sans RN via l'API `getPreferenceSnapshot`
côté hooks). Consommé par les 3 écrans **via une seule source de tri**.

**Rôle** : *le qui / quand*. Décide **quels** commerces, **dans quel ordre**, **à quel zoom**, selon
**contexte / saison / heure / préférences**. C'est l'intelligence de YOOTOO.

**État réel (en prod)** :
- **Ranking éditorial unique** : `getMerchantEditorialScore` → `rankMerchantsEditorially` (mission/tier
  via `resolveTier`, qualité fiche, qualité visuelle, note, stable). → [ADR-003](./adr/README.md).
- **Diversification vitrine** : `editorialDiversification` (round-robin par famille, bande d'excellence).
- **Signaux** : `timeSignals`, `context.ts` (`seasonOf`), préférences (`preferences/`), registre de
  signaux plug-in (`registry.ts`, `merchantSignals.ts`).
- Utilisé **partout pareil** : `buildHomeSections` (Accueil), `useMerchantSearch` (Carte + Commerçants).
  → aucun pipeline parallèle. Voir la correction du 2026-07 (unification moteur).

**Prochaines briques Discovery** :
- **Zoom-aware** : quels commerces à quel niveau de zoom (Phase 5, apparition éditoriale).
- **Context-aware marker state** : `markerState(merchant, ctx)` (Phase 6 : marché du samedi, café du
  matin, producteur en saison) — le style ne change pas, **l'importance** évolue.

---

## Testabilité (invariant)

Toute **logique** vit dans une fonction **pure** (aucune dépendance carte/DOM/RN) → testée en jest.
Le **rendu** est validé par revue visuelle (je ne peux pas juger le rendu web à ta place). Règle :
*si une décision d'affichage peut être exprimée en fonction pure, elle DOIT l'être* (ex.
`photoPriority`, `resolveTier`, `markerState`, `isPlausibleViewport`).
