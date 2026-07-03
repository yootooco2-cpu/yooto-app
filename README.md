# YOOTOO

Application **mobile + web** de découverte du commerce local : trouver les producteurs,
épiceries, artisans et commerces responsables autour de soi, sur une carte intelligente.

Construite avec **Expo (React Native) + Expo Router + TypeScript**, avec **Supabase** en
back-end et **Mapbox** pour la cartographie. Le même code tourne sur **iOS, Android et Web**.

## ✨ Fonctionnalités

**Implémentées**
- 🗺️ **Carte intelligente Mapbox** — clustering adaptatif au zoom ; marqueurs commerces
  (photo + cryptogramme premium de catégorie + anneau couleur), fiche au tap.
- 🧭 **Découverte** — accueil éditorial (ranking), méga-menu de catégories partagé avec la
  page Commerçants (survol web / tap mobile), recherche + filtres rapides.
- 🏪 **Commerçants & producteurs** — liste, catégories officielles (cryptogrammes), fiche
  détaillée, données Supabase avec repli automatique sur des données de démo.
- 🌿 **De saison** — guide saisonnier des produits (12 mois illustrés).
- 👤 **Profil** — préférences et personnalisation de la découverte.

**Vision / roadmap**
- 💶 Gestion de budget personnel · 🎁 récompenses comportementales · 🌍 score
  écologique/local · 🤖 IA de recommandation approfondie · 🔗 couche crypto/Web3 invisible.

## 🧱 Stack

| Domaine | Techno |
|---|---|
| App | Expo SDK 56 · React Native 0.85 · Expo Router (routing par fichiers) |
| Langage | TypeScript (strict) |
| Back-end | Supabase (Postgres + RLS, clé **anon** publique côté client) |
| Carte | Mapbox GL (web) / Mapbox natif |
| État / data | Zustand · React Query |

## 📋 Prérequis

- **Node.js ≥ 20** (testé sur Node 24) et **npm**
- **Expo Go** (iOS/Android) ou un simulateur/émulateur pour le mobile
- Comptes **Supabase** et **Mapbox** (optionnels : sans clés, l'app tourne en mode démo)

## 🚀 Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# puis renseigner .env (voir ci-dessous) — laisser vide = mode démo, aucun crash

# 3. Lancer
npm run start      # menu Expo (QR code Expo Go, choix plateforme)
npm run web        # ouvrir dans le navigateur
npm run ios        # simulateur iOS (macOS)
npm run android    # émulateur Android
```

## 🔑 Variables d'environnement

Copiez `.env.example` vers `.env`. Toutes les variables client sont préfixées
`EXPO_PUBLIC_` (inlinées dans le bundle) :

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Token **public** Mapbox (`pk.…`), à restreindre par domaine. Vide → carte en placeholder. |
| `EXPO_PUBLIC_MAPBOX_STYLE_URL` | (Optionnel) style Mapbox personnalisé. |
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase. Vide → données de démo. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé **anon** publique (protégée par RLS). |

> ⚠️ Ne jamais committer de secret : `.env` est ignoré par git. La clé `service_role`
> et le token Mapbox secret `sk.…` ne doivent **jamais** entrer dans le bundle/repo.

## 🗂️ Structure

```
src/
  app/            # routes Expo Router (écrans) : (tabs)/, merchant/[id], _layout
  components/     # UI partagée (cards, map, home, ui, merchants)
  features/       # domaines métier
    merchants/    #   commerces : données, cryptogrammes, recherche, carte
    map/          #   moteur cartographique (clustering Mapbox)
    discovery/    #   accueil éditorial, méga-menu de catégories, ranking
    carnet/       #   guide « De saison »
    profile/      #   profil & préférences
    location/     #   géolocalisation
  lib/            # intégrations (supabase, geo, data)
  design/tokens/  # design system (couleurs, espacements, rayons…)
  constants/ types/
supabase/migrations/  # schéma & RLS
assets/               # images (cryptogrammes, illustrations carnet…)
```

## 🧪 Qualité

```bash
npx tsc --noEmit                 # vérification TypeScript
npm run lint                     # ESLint (expo lint)
npx expo export --platform web   # build web statique (dist/)
```

## 📄 Licence

Propriétaire — © YOOTOO. Tous droits réservés.
