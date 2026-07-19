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
- aucune valeur de cle, aucune URL complete, aucun JWT et aucun contenu de fichier `.env`
  n'ont ete affiches.

Aucune cle privilegiee n'a ete utilisee.

## Requetes live consommees

Fenetre precedente: 3 tentatives consommees, documentees dans le commit
`bcf70d5bb7178858d1277ec5c94faed97a15c777`.

Nouvelle fenetre autorisee:

- pre-verification reseau non metier: 1 tentative, HTTP 401, connectivite confirmee;
- SELECT metier: 3 tentatives consommees;
- aucun retry;
- aucune quatrieme requete SELECT.

## Resultat agrege des requetes prevues

| Requete | Objectif | Colonnes | Limite | Statut |
| --- | --- | --- | --- | --- |
| 1 | Visibilite active minimale | `id,status,is_active` | 5 | HTTP 401, categorie `AUTH_OR_RLS`, 0 ligne |
| 2 | Projection Lot 4 | Projection minimale Lot 4 | 5 | HTTP 401, categorie `AUTH_OR_RLS`, 0 ligne |
| 3 | Controle negatif RLS | `id,status,is_active` | 5 | HTTP 401, categorie `AUTH_OR_RLS`, 0 ligne |

Resultats agreges:

- requete 1: aucune ligne retournee; aucune violation des filtres constatee, mais lecture non validee;
- requete 2: aucune colonne confirmee; 0 projection acceptee; 0 projection mise en quarantaine;
- requete 3: 0 ligne non publiable observee; controle RLS non valide car la lecture a echoue
  avant resultat HTTP exploitable.

## Schema reellement confirme

Aucun schema live n'a ete confirme pendant ce lot. Les trois lectures ont atteint la Data API mais
ont ete refusees avec HTTP 401 avant toute donnee exploitable.

## Ecarts avec l'adaptateur Lot 4

Aucun ecart live n'a pu etre constate.
Aucune correction de projection, de type ou d'adaptateur n'est justifiee sans preuve live.

## Controle RLS

Controle negatif RLS tente en troisieme requete. Aucune ligne non publiable n'a ete observee,
mais le controle n'est pas valide car la tentative a ete refusee avec HTTP 401 avant resultat
exploitable.

## Corrections locales

Aucune correction fonctionnelle.
Seul ce rapport anonymise Lot 4B est ajoute.

## Tests executes

- Tests YootChat cibles pre-branche: 159 reussis.
- Tests adaptateur: 31 reussis.
- Tests YootChat cibles finaux: 159 reussis.
- Suite complete: 898 reussis, 6 ignores, 0 echec.
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

SUPABASE_LIVE_VALIDATION_BLOCKED

## Recommandation suivante

Verifier dans Supabase que la cle publishable locale est autorisee pour le projet cible et que
la Data API accepte les appels publics attendus. Aucune nouvelle lecture ne doit etre lancee sans
une nouvelle fenetre explicitement autorisee.
