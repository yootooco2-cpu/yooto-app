# PROJECT_CONTEXT.md — YOOTOO

> Référence officielle du projet. Décrit la **vision, la philosophie, l'architecture,
> les décisions et la roadmap**. Complète `DESIGN.md` sans jamais le dupliquer :
> `DESIGN.md` = **seule** référence graphique ; ce document = tout le reste.

_Dernière révision : 2026-07 · Statut : vivant (mis à jour à chaque décision structurante)._

---

## 1. Vision

**YOOTOO veut être la meilleure plateforme de découverte locale intelligente.**

L'utilisateur ouvre l'application et, en quelques secondes, découvre les commerces
responsables autour de lui : producteurs, épiceries, artisans, restaurants engagés.

L'**intelligence assiste** l'utilisateur — elle ne le remplace jamais :

- elle met en avant ce qui est **pertinent**, au bon endroit, au bon moment ;
- elle **explique** toujours pourquoi ;
- elle **laisse la décision** à l'utilisateur.

> YOOTOO s'inspire de l'**intelligence** du Bon Coin, de la **simplicité** d'Apple,
> de la **mise en valeur** d'Airbnb et de la **géographie** de Google Maps —
> mais reste 100 % YOOTOO : local, responsable, transparent.

---

## 2. Philosophie produit

| Principe | Ce que cela signifie |
|---|---|
| **Simplicité** | Une interface qui respire, jamais chargée. Chaque écran a un objectif clair. |
| **Confiance** | L'utilisateur comprend ce qui se passe. Rien de caché. |
| **Transparence** | Les recommandations sont expliquées, jamais opaques. |
| **Commerce local** | Producteurs et indépendants sont au cœur du produit. |
| **Sobriété** | Peu d'éléments, beaucoup d'espace, aucune surcharge. |
| **Confidentialité** | Les données de préférence restent locales. |
| **Explicabilité** | Toute mise en avant est justifiable en langage clair. |

> **Les dark patterns sont interdits.** Pas de faux compte à rebours, pas de
> notifications culpabilisantes, pas de rétention forcée, pas de consentement piégé.

---

## 3. Valeurs

- **L'utilisateur garde toujours le contrôle.** Il peut explorer, filtrer, réinitialiser, exporter.
- **Les recommandations doivent être expliquées.** Jamais de score brut ; toujours une raison lisible.
- **La qualité prévaut sur la quantité.** Mieux vaut 5 bons résultats que 50 médiocres.
- **La performance fait partie de l'expérience.** La fluidité est une fonctionnalité.
- **Chaque fonctionnalité doit apporter une vraie valeur.** Sinon elle n'existe pas.

---

## 4. Stack technique

| Domaine | Technologie | Rôle |
|---|---|---|
| Runtime | **Expo SDK 56** | plateforme (New Architecture) |
| Framework | **React Native 0.85** | app iOS / Android / Web |
| Langage | **TypeScript strict** | typage fort, sûreté |
| Navigation | **Expo Router** | routing fichier, typed routes |
| Données serveur | **React Query** | cache, loading/error, requêtes |
| Backend | **Supabase** | base de données + Storage (lecture anon + RLS) |
| Cartographie | **Mapbox GL JS** (web) | carte, clustering natif |
| Enrichissement | **Google Places** | photos & métadonnées commerces (pipeline serveur) |
| État global léger | **Zustand** | recherche/filtres partagés |
| Animations | **Reanimated** | micro-interactions 150–220 ms |
| Images | **expo-image** | cache mémoire/disque, transitions |
| Persistance locale | **react-native-mmkv** | préférences (dev build ; fallback mémoire) |

_Détails de configuration et de versions : voir `package.json` (source de vérité)._

---

## 5. Architecture globale

```
┌─────────────────────────────────────────────┐
│                    UI                         │  écrans Expo Router, composants DS
│  (app/(tabs), app/merchant/[id], components)  │
└───────────────────────┬───────────────────────┘
                        │  (ne contient pas de logique métier)
┌───────────────────────▼───────────────────────┐
│               FEATURE MODULES                  │  features/merchants, features/map,
│   hooks · adapters · schémas · repositories    │  features/profile, features/location
└───────────────────────┬───────────────────────┘
                        │
┌───────────────────────▼───────────────────────┐
│              DISCOVERY ENGINE                  │  score · ranking · reasons · cache
│         (signaux plug-in, pur, local)          │  intents/ (Intent Engine)
└───────────────────────┬───────────────────────┘
                        │  context.preferences
┌───────────────────────▼───────────────────────┐
│             PREFERENCE ENGINE                  │  profil incrémental · décroissance
│      (local, explicable, plug-in, privé)       │  behaviorTracker · storage
└───────────────────────┬───────────────────────┘
                        │
┌───────────────────────▼───────────────────────┐
│               INFRASTRUCTURE                   │  lib/data (contrats génériques),
│   EntityRepository · DataSource · Storage      │  lib/supabase, lib/geo, lib/queryClient
└───────────────────────┬───────────────────────┘
                        │
┌───────────────────────▼───────────────────────┐
│                  SUPABASE                      │  table merchants (RLS anon) + Storage
└─────────────────────────────────────────────┘
```

**Règle de dépendance :** l'UI dépend des features, les features du Discovery Engine,
le Discovery Engine consomme le Preference Engine **via le contexte** ; les couches
basses ne connaissent jamais l'UI. **Aucun import circulaire** (les liens croisés se
font uniquement via des `import type`, effacés au runtime).

---

## 6. État actuel du projet

| Bloc | Statut |
|---|---|
| Design System (`DESIGN.md`) | ✅ stable |
| Navigation 4 onglets (Accueil · Carte · Commerçants · Profil) | ✅ |
| Fiche commerce complète (coordonnées, horaires, contact, galerie) | ✅ |
| Cartographie Mapbox + **clustering natif** + photo markers | ✅ |
| Pipeline Photos (Google Places → Supabase Storage) | ✅ (n8n) |
| Galerie commerces (cover + ≤ 2 vignettes, fallback) | ✅ |
| Repository / DataSource génériques + fallback local | ✅ |
| **Discovery Engine** (signaux, ranking, reasons, cache) | ✅ **stable** |
| **Intent Engine** (compréhension de la recherche) | ✅ |
| **Adaptive Discovery Intelligence** (préférences apprises) | ✅ |
| Recency weighting (décroissance temporelle v2) | ✅ |
| Profil → Préférences (vue, export, reset) | ✅ |
| Persistance **MMKV** (dev build) + fallback Web/Expo Go | ✅ |
| **Pages légales** (CGU + Politique de confidentialité) | ✅ **Completed — terminé & figé** |

> **Pages légales — Completed & figées (2026-07-09).** UX & technique **validés** : routes `/legal/terms` et `/legal/privacy`, écran `LegalScreen` (DA sombre, sections structurées, bouton retour, responsive, contact cliquable), entrées « Légal » rebranchées dans les Réglages, texte isolé et remplaçable dans `src/features/legal/content.ts` (bandeau « version provisoire »). **Hors périmètre de développement** : aucune évolution ne sera apportée, sauf — (1) corrections de bugs ; (2) mise à jour du contenu après **validation par un juriste** ; (3) ajout des **informations légales définitives** (raison sociale, SIRET, adresse, responsable de traitement) ; (4) **publication des mêmes contenus sur une URL web publique** avant soumission App Store / Play Store.

---

## 7. Discovery Engine

Le **cerveau unique** de la recommandation. Aucune autre partie de l'app ne calcule
de pertinence.

- **Architecture plug-in** : un signal est une fonction pure
  `(merchant, ctx) => SignalContribution | null`. On ajoute un facteur en
  l'enregistrant dans le registre — sans modifier le cœur.
- **Signaux actuels** : distance · ouverture · note · producteur · éco · moment
  (midi/soir) · saison · favoris · habitudes · historique · **intention** · **préférence**.
- **Ranking** : `recommend(merchants, ctx)` = moyenne pondérée des signaux applicables,
  triée par pertinence décroissante.
- **Cache** : `recommendCached` — `WeakMap` par référence de liste × `Map` par
  **signature de contexte** (position arrondie, heure, saison, intention, préférences).
  Pas de recalcul inutile ; libération automatique quand la liste change.
- **Explicabilité** : les signaux les plus contributifs génèrent des **raisons
  lisibles** (« À quelques minutes de vous », « Ouvert actuellement », « Catégorie
  souvent consultée »…). **Jamais de score brut affiché.**

> **API publique stable** : `recommend`, `recommendCached`, `getDiscoveryReasons`,
> `buildDiscoveryContext`, `rankMerchants`, `resolveIntent`, `registerSignal`.

---

## 8. Adaptive Discovery Intelligence

- **Moteur local** : apprend les préférences à partir du comportement (Preference Engine).
- **Événements** : `open_merchant`, `go_there`, `save`, `favorite`, `search_used`,
  `filter_selected`, `category_opened` (plug-in ; `visit`/mission/cashback prévus).
- **Recency weighting** : décroissance temporelle exponentielle appliquée à l'écriture
  (7 j ≈ 0.94 · 30 j ≈ 0.77 · 90 j ≈ 0.45 · 180 j ≈ 0.20). Incrémental, O(catégories).
- **Profil vivant** : catégories favorites, affinité producteurs, nombre d'interactions.
- **Export / Reset** : `exportPreferences()` / `resetPreferences()` — l'utilisateur garde le contrôle.
- **Confidentialité** : 100 % local, aucun réseau, aucune donnée sensible.

---

## 9. Cartographie

- **Mapbox GL JS** (web) derrière l'interface `MapEngine` (le natif utilise un
  placeholder en attendant `@rnmapbox/maps`).
- **Clustering natif** : source GeoJSON unique + couches cluster/comptage. Le moteur
  décide, la carte affiche.
- **Photo markers** : au zoom, pool **borné** de marqueurs photo ronds (bord blanc,
  ombre), sélection = contour vert + légère mise à l'échelle. Le DOM ne contient
  jamais des milliers de marqueurs.
- **Hero Card** : aperçu animé du commerce sélectionné, bouton « Voir la fiche ».
- **Performance** : rendu porté par GL (GPU), cadrage automatique, marqueurs HTML
  plafonnés, clusters à taille continue.

---

## 10. Pipeline Photos

```
Google Places Photos
        ↓  (fetch serveur / n8n)
Supabase Storage : merchant-photos/<google_place_id>/{0,1,2}.jpg
        ↓
merchants.cover_photo_url · gallery_photos · photo_count · last_photo_sync
        ↓  (repository + zod mapper)
Merchant (coverPhotoUrl, galleryPhotos, photoUrl…)
        ↓
UI : MerchantPhoto (cover) + galerie (≤ 2 vignettes)
```

- **Clé de correspondance** : `google_place_id`.
- **Fallback** : si aucune vraie photo → placeholder **YOOTOO premium** (jamais un
  placeholder technique). Les URLs `/fallbacks/` sont traitées comme « pas de photo ».
- **Enrichissement** : orchestré côté serveur (n8n) ; l'app **consomme** uniquement.

---

## 11. Design System

> **`DESIGN.md` est la seule référence graphique** (couleurs, rayons, ombres,
> espacements, typographie, animations, ton rédactionnel).
>
> `PROJECT_CONTEXT.md` **ne duplique jamais** `DESIGN.md`. Toute question de rendu
> visuel se tranche dans `DESIGN.md`.

---

## 12. Décisions d'architecture (ADR)

### ADR-001 — Discovery Engine unique
- **Décision** : une seule source de recommandation pour toute l'app.
- **Pourquoi** : cohérence, explicabilité, évolutivité ; éviter la logique dispersée.
- **Conséquences** : tout écran passe par `recommend`/`getDiscoveryReasons` ; API publique stable.

### ADR-002 — Mapbox pour la cartographie
- **Décision** : Mapbox GL JS (web) + clustering natif ; interface `MapEngine` abstraite.
- **Pourquoi** : qualité cartographique, clustering GPU, contrôle du rendu.
- **Conséquences** : le natif nécessitera `@rnmapbox/maps` + dev build ; le web est prioritaire.

### ADR-003 — Google Places pour l'enrichissement photos
- **Décision** : photos/métadonnées via Google Places, stockées dans Supabase Storage.
- **Pourquoi** : couverture et qualité des visuels ; l'app reste simple consommatrice.
- **Conséquences** : pipeline serveur (n8n) ; attribution Google à respecter ; clé secrète côté serveur uniquement.

### ADR-004 — Preference Engine local
- **Décision** : apprentissage des préférences **en local**, sans backend.
- **Pourquoi** : vie privée, réactivité, absence de dépendance réseau.
- **Conséquences** : export/reset côté utilisateur ; synchronisation future optionnelle et consentie.

### ADR-005 — MMKV pour la persistance
- **Décision** : `react-native-mmkv` (v4 Nitro) sur dev build ; fallback mémoire ailleurs.
- **Pourquoi** : stockage local rapide ; pas de dépendance réseau.
- **Conséquences** : dev build requis pour la persistance native ; Web/Expo Go = mémoire (sans crash).

### ADR-006 — Architecture plug-in (signaux & storage)
- **Décision** : signaux et backends de stockage enfichables via registre/factory.
- **Pourquoi** : ajouter un facteur ou un backend sans réécrire le cœur.
- **Conséquences** : faible couplage, haute testabilité, évolution non destructive.

### ADR-007 — Repository / DataSource génériques + fallback local
- **Décision** : `EntityRepository<T, Q>` / `EntityDataSource<T, Q>` avec fallback local.
- **Pourquoi** : l'app ne casse jamais si Supabase est absent ; Supabase remplaçable.
- **Conséquences** : filtrage/tri côté client cohérents ; données de démo comme filet.

### ADR-008 — Intent Engine local & déterministe
- **Décision** : compréhension de la recherche par dictionnaire, sans LLM ni réseau.
- **Pourquoi** : rapidité, déterminisme, confidentialité ; API stable vers embeddings futurs.
- **Conséquences** : « pain » élargit à la filière boulangère ; enrichissement possible plus tard.

### ADR-009 — Recency weighting (décroissance temporelle)
- **Décision** : atténuation exponentielle des préférences anciennes, à l'écriture.
- **Pourquoi** : refléter les habitudes récentes sans recalcul global coûteux.
- **Conséquences** : profil versionné (v2) + migration ; complexité O(catégories).

---

## 13. Standards de développement

- **TypeScript strict** partout ; pas de `any` non justifié.
- **Composants simples** : présentation seule, pas de logique métier dans l'UI.
- **Hooks dédiés** : la logique d'écran vit dans des hooks (`useMerchantSearch`, `usePreferenceSummary`…).
- **Fonctions pures** pour le moteur (testables, déterministes ; le temps est injectable).
- **Architecture modulaire** : `features/<domaine>/` avec `index.ts` barrel.
- **Imports propres** : pas de cycle runtime ; liens inter-domaines en `import type`.
- **Validations obligatoires** avant tout merge : `npx tsc --noEmit`, `npm run lint`, `expo export --platform web`.

---

## 14. Performance

| Objectif | Moyen |
|---|---|
| **60 FPS** | animations Reanimated courtes, rendu GPU Mapbox |
| **Peu de re-renders** | `useMemo`, sélecteurs Zustand atomiques, `useSyncExternalStore` |
| **Cache** | React Query (données) + cache de recommandations (Discovery) |
| **Carte fluide** | clustering natif, DOM borné (pool de marqueurs) |
| **Lazy loading** | `mapbox-gl` en import dynamique, images `expo-image` (cache/recyclingKey) |
| **Virtualisation** | `FlatList` pour les longues listes |

---

## 15. Confidentialité

- **100 % local** pour les préférences ; aucune synchronisation obligatoire.
- **Pas de télémétrie cachée**, pas de tracking réseau, pas de pixel espion.
- **Pas de dark patterns** (cf. §2).
- **Export** et **reset** des préférences accessibles à l'utilisateur.
- **Contrôle utilisateur** : l'utilisateur décide toujours.
- Supabase : lecture **anon** + RLS ; **jamais** de `service_role` côté client.

---

## 16. Roadmap active

- **Carte native** : `@rnmapbox/maps` + dev build (interface `MapEngine` déjà prête).
- **Signaux futurs** (plug-in) : météo, événements locaux, fréquentation, promotions,
  cashback, missions YOOTOO, budget, visites GPS réelles.
- **Recherche enrichie** : suggestions, catégories populaires (via l'Intent Engine).
- **Espace commerçant** : revendication de fiche, validation admin, offres (migrations Supabase déjà esquissées).
- **PostGIS / FTS** : filtrage & distance côté serveur quand le volume le justifie.
- **Synchronisation optionnelle & consentie** des préférences.

---

## 17. Règles pour les futurs agents IA

> Section **critique**. À lire avant toute contribution.

1. **Ne jamais casser `DESIGN.md`** — c'est la référence graphique absolue.
2. **Ne jamais casser le Discovery Engine** ni son API publique (§7).
3. **Toujours privilégier un plug-in** (nouveau signal / backend) plutôt qu'une réécriture.
4. **Ne jamais modifier une API publique sans justification** explicite et documentée.
5. **Toujours préserver les performances** (§14) — la fluidité est une fonctionnalité.
6. **Toujours privilégier la simplicité** — moins, mais mieux.
7. **Ne jamais ajouter une dépendance inutile.**
8. **Toujours documenter les décisions importantes** — créer un ADR (§12).
9. **Respecter les ADR existants** ; en cas de remise en cause, écrire un ADR qui les supersède.
10. **Rester local & privé** : aucun tracking réseau, aucune donnée sensible, pas de dark pattern.
11. **Valider systématiquement** : `npx tsc --noEmit`, `npm run lint`, `expo export --platform web`.
12. **Ne pas coupler l'UI au moteur** : l'UI émet des événements / consomme des API, rien de plus.

---

_Fin du document. Toute évolution structurante doit être reflétée ici (et, si c'est
une décision, ajoutée en ADR). `DESIGN.md` reste souverain pour le design._
