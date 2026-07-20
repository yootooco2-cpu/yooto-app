# YootChat - Lot 4B micro-validation Supabase publique

Date: 2026-07-19

## Source et filiation

- Depot distant verifie: `https://github.com/yootooco2-cpu/yooto-app.git`
- Branche source distante verifiee: `feat/yootchat-supabase-read-adapter`
- Commit source obligatoire: `89ad6d06eb0d16efa119e0f7f2eedb077dc28bc5`
- Parent verifie: `e547e0fbd79b3be3e58250845ba75a37608bd2b0`
- Branche de travail: `feat/yootchat-supabase-live-validation`

La branche distante GitHub pointe bien sur le commit source obligatoire.
Le worktree de depart etait propre et les tests YootChat cibles passaient avant creation
de la branche Lot 4B.

## Documentation Supabase consultee

- API keys: les cles publishable et `anon` sont les seules acceptables pour un chemin public; les cles secret et `service_role` sont privilegiees et interdites ici.
- RLS: l'acces public doit rester protege par les politiques Postgres des roles `anon` et `authenticated`.
- `supabase-js` SELECT: la projection explicite est le chemin attendu; `select("*")` reste interdit pour cette validation.
- `AbortSignal`: les requetes PostgREST peuvent etre bornees par annulation transport.
- Changelog: `@supabase/supabase-js` exigera TypeScript 5.0+ a partir du 31 janvier 2027.

Sources officielles consultees:

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/reference/javascript/select
- https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal
- https://supabase.com/changelog

## Type de cle disponible

KEY_TYPE=PUBLISHABLE

Constats sans affichage de valeur:

- `.env.local` ignore par Git;
- exactement une URL publique declaree;
- exactement une cle publique declaree;
- classification locale de la cle: `PUBLISHABLE`;
- ancienne valeur locale publishable incorrecte: 184 caracteres, remplacee;
- cle publishable finale certifiee: 46 caracteres, empreinte locale conforme a la cle
  `yootchat-public`;
- aucune valeur de cle, aucune URL complete, aucun JWT et aucun contenu de fichier `.env`
  n'ont ete affiches.

Aucune cle privilegiee n'a ete utilisee.

## Requetes live consommees

Fenetre precedente: 3 tentatives consommees, documentees dans le commit
`bcf70d5bb7178858d1277ec5c94faed97a15c777`.

Tentatives intermediaires:

- la racine `/rest/v1/` a retourne HTTP 401 avec les cles publiques;
- ce resultat n'est pas utilise comme preuve de rejet public: depuis le changement Supabase
  de mars 2026, la racine OpenAPI n'est pas un test public fiable;
- la route metier `/rest/v1/merchants` est le seul chemin retenu pour la validation.

Fenetre finale Lot 4L:

- SELECT live: 1 tentative consommee;
- projection explicite des 14 colonnes reelles;
- filtre `status=active` et `is_active=true`;
- limite 5;
- header `apikey` avec la cle publishable certifiee;
- header `Accept-Profile: public`;
- aucun header `Authorization`;
- aucun retry;
- aucun autre SELECT.

## Resultat agrege des requetes prevues

| Requete | Objectif | Colonnes | Limite | Statut |
| --- | --- | --- | --- | --- |
| 1 | Projection reelle Lot 4L | 14 colonnes reelles | 5 | HTTP 200, categorie `NONE`, 5 lignes |

Resultats agreges:

- colonnes presentes: 14/14;
- projections acceptees: 4;
- projections mises en quarantaine: 1;
- accessibilites produites: 4 `UNKNOWN`;
- aucune donnee brute, aucun nom, aucun identifiant et aucune coordonnee n'ont ete affiches.

## Schema reellement confirme

Schema live confirme pour `public.merchants`:

`id,name,status,is_active,city,latitude,longitude,google_rating,category,opening_hours,est_ess,est_bio,artisan_rm,est_societe_mission`

Colonne absente du schema reel: `is_accessible`.

Aucune colonne alternative d'accessibilite publique n'est certifiee pour ce lot.

## Ecarts avec l'adaptateur Lot 4

Ecart live constate: la projection Lot 4 initiale demandait `is_accessible`, absente du schema reel.

Correction appliquee:

- projection Supabase reduite aux 14 colonnes reelles;
- `select("*")` reste interdit;
- aucune lecture de `is_accessible`;
- l'accessibilite issue de Supabase est toujours projetee en `UNKNOWN`;
- aucune affirmation PMR certaine n'est produite sans colonne probante;
- services et equipements restent des tableaux vides;
- les quatre engagements officiels restent structures et valides par booleens.

## Controle RLS

Controle negatif RLS Lot 4K: HTTP 200, 0 ligne non publiable visible.

## Corrections locales

Corrections fonctionnelles limitees au perimetre YootChat Supabase read adapter:

- `src/features/yootchat/readPort.ts`;
- `src/features/yootchat/supabaseReadAdapter.ts`;
- `src/features/yootchat/supabaseReadAdapter.test.ts`;
- ce rapport anonymise.

## Tests executes

- Tests YootChat cibles pre-branche: 159 reussis.
- Tests adaptateur: 34 reussis.
- Tests YootChat cibles finaux: 162 reussis.
- Suite complete: 901 reussis, 6 ignores, 0 echec.
- TypeScript cible YootChat: 0 erreur.
- ESLint cible YootChat: 0 erreur.
- `git diff --check`: 0 erreur.
- Scan ecritures reseau/SQL dans le code YootChat: aucune methode d'ecriture.
- Scan secrets: aucune valeur de cle detectee; seules des mentions textuelles de types de cles
  apparaissent dans ce rapport de securite.
- Perimetre Git: rapport Lot 4B uniquement.

## Cout reel

0 euro.

## Verdict

SUPABASE_READ_ADAPTER_CERTIFIED_WITH_ACCESSIBILITY_UNKNOWN

## Recommandation suivante

Poursuivre le Lot 5 avec l'accessibilite consideree comme inconnue tant qu'aucune colonne publique
probante n'est ajoutee au schema.
