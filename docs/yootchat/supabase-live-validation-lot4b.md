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

Aucune cle publique utilisable n'a ete trouvee.

Constats sans affichage de valeur:

- environnement courant: aucun nom Supabase public disponible;
- `.env.example`: noms publics documentes mais valeurs absentes;
- fichier local hors depot: uniquement des noms de cles privilegiees Supabase et une URL;
- aucune valeur de cle, aucun JWT et aucun contenu de fichier `.env` n'ont ete affiches.

Les cles privilegiees detectees n'ont pas ete utilisees, conformement a la mission.

## Requetes live consommees

Nombre exact de requetes Supabase live consommees: 0.

Aucune des trois lectures autorisees n'a ete lancee, car l'identifiant public requis est absent.

## Resultat agrege des requetes prevues

| Requete | Objectif | Colonnes | Limite | Statut |
| --- | --- | --- | --- | --- |
| 1 | Visibilite active minimale | `id,status,is_active` | 5 | Non executee, cle publique absente |
| 2 | Projection Lot 4 | Projection minimale Lot 4 | 5 | Non executee, cle publique absente |
| 3 | Controle negatif RLS | `id,status,is_active` | 5 | Non executee, cle publique absente |

## Schema reellement confirme

Aucun schema live n'a ete confirme pendant ce lot, faute de cle publique.
Le schema reste celui documente par le Lot 4, en attente de validation reelle.

## Ecarts avec l'adaptateur Lot 4

Aucun ecart live n'a pu etre constate.
Aucune correction de projection, de type ou d'adaptateur n'est justifiee sans preuve live.

## Controle RLS

Controle negatif RLS non execute, car aucune cle publique n'est disponible.
Aucune exposition de fiche non publiable n'a ete observee.

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

SUPABASE_LIVE_VALIDATION_BLOCKED_PUBLIC_KEY_MISSING

## Recommandation suivante

Fournir une cle publique Supabase publishable ou `anon` via une variable locale non affichee,
par exemple un nom deja prevu par le projet. Relancer ensuite exactement les trois SELECT
bornes du Lot 4B, sans requete corrective, sans RPC, sans ecriture et sans affichage de ligne brute.
