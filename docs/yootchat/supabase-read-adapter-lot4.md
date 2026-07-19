# YootChat - Lot 4 adaptateur Supabase lecture seule

Date: 2026-07-19

## Source

- Branche source: `feat/yootchat-deterministic-engine-rebuild`
- Commit source: `e547e0fbd79b3be3e58250845ba75a37608bd2b0`
- Parent certifie: `a9dce3524eb7e45a7118189c985acf68ecdbe5da`
- Nouvelle branche: `feat/yootchat-supabase-read-adapter`

## Documentation Supabase consultee

- Changelog Supabase: annonce du 10 juillet 2026, `@supabase/supabase-js` exigera TypeScript 5.0+ a partir du 31 janvier 2027.
- Documentation `supabase-js` SELECT: `select(columns)` accepte une projection explicite, et Supabase recommande de garder les limites de lignes basses.
- Documentation `abortSignal`: les requetes PostgREST peuvent recevoir un `AbortSignal`, y compris via `AbortSignal.timeout(ms)`.
- Documentation Data API security: l'exposition combine grants Postgres et RLS; les fonctions `SECURITY DEFINER` doivent etre revues separement car RLS ne s'y applique pas directement.
- Documentation API keys: les cles publishable/anon ne sont pas des secrets, mais elles doivent rester protegees par RLS et des grants minimaux; les cles `service_role` et secretes contournent RLS et sont interdites ici.
- Documentation JWT: le JWT utilisateur doit etre transmis par le client Supabase pour que le role `authenticated` et les politiques RLS s'appliquent.

## Schema utile observe

La verite live n'a pas pu etre inspectee avec une cle publique: le seul fichier local disponible
contenait des cles privilegiees (`SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`), volontairement
non utilisees. La cartographie ci-dessous est donc etablie depuis les migrations versionnees, la
fonction YootChat v4 sauvegardee et le schema applicatif existant.

| Colonne | Type observe localement | Nullable | Data API | Utilite YootChat | Destination | Remplacement sur absence | Exclusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `id` | `bigint` reel documente par migrations 002/003, `uuid` historique dans 001 | non | oui si SELECT autorise | identifiant public | `SourceMerchantRecord.id` | aucun | invalide si vide/non entier positif/non string |
| `name` | `text` | non | oui | nom public | `facts.name` | aucun | invalide si vide |
| `status` | enum/text | non | oui | publiabilite | `status` | aucun | seul `active` accepte |
| `is_active` | boolean reel utilise par v4 | non suppose | oui si colonne exposee | publiabilite stricte | `isActive` | aucun | seul `true` accepte |
| `city` | `text` | oui | oui | filtre ville | `facts.city` | `null` | invalide si chaine vide |
| `latitude` | double precision | oui/non selon reel | oui | calcul geographique | calcul `distanceKm` | `null` | invalide si hors bornes |
| `longitude` | double precision | oui/non selon reel | oui | calcul geographique | calcul `distanceKm` | `null` | invalide si hors bornes |
| `google_rating` | numeric/double | oui | oui | note publique | `facts.rating` | `null` | invalide hors 0..5 |
| `category` | `text` | non | oui | categorie projet | `facts.category` | aucun | invalide si vide |
| `opening_hours` | json/jsonb | oui | oui | ouverture structuree | `facts.openNow` | `null` | invalide si `open_now` non booleen |
| `is_accessible` | boolean historique | oui/non | oui | accessibilite prudente | `facts.accessibility` | `UNKNOWN` | `true` seul devient accessible verifie |
| `est_ess` | boolean | oui | oui | engagement officiel | `officialCommitments[]` | absent | seul `true` publie une preuve |
| `est_bio` | boolean | oui | oui | engagement officiel | `officialCommitments[]` | absent | seul `true` publie une preuve |
| `artisan_rm` | boolean | oui | oui | engagement officiel | `officialCommitments[]` | absent | seul `true` publie une preuve |
| `est_societe_mission` | boolean | oui | oui | engagement officiel | `officialCommitments[]` | absent | seul `true` publie une preuve |

Colonnes volontairement exclues: `email`, `phone`, `address`, proprietaire, `user_id`,
facturation, notes internes, scores internes, moderation, enrichissement, secrets, tokens,
descriptions libres et donnees administratives non necessaires au moteur.

## Architecture realisee

- Port domaine: `src/features/yootchat/readPort.ts`
- Implementation Supabase: `src/features/yootchat/supabaseReadAdapter.ts`
- Projection runtime stricte: `projectRow`
- Integration moteur: `runYootChatWithMerchantReadPort`
- Tests: `src/features/yootchat/supabaseReadAdapter.test.ts`

Le domaine ne depend pas de `supabase-js`. L'adaptateur accepte une interface structurelle minimale
qui expose seulement `from(...).select(...).eq(...).limit(...).abortSignal(...)`.

## Projection minimale

Projection unique:

```text
id,name,status,is_active,city,latitude,longitude,google_rating,category,opening_hours,is_accessible,est_ess,est_bio,artisan_rm,est_societe_mission
```

`select("*")` est interdit par constante et par test.

## RLS et securite

Les migrations versionnees activent RLS sur `public.merchants` et contiennent une politique publique
de lecture des commerces actifs. Le Lot 4 ajoute un filtre applicatif redondant obligatoire:

- `status = active`
- `is_active = true`

Les politiques et fonctions `SECURITY DEFINER` existantes ne sont pas modifiees. Les cles
privilegiees locales n'ont pas ete utilisees.

## Quotas et timeout

- Limite par defaut: 30 lignes.
- Limite absolue: 100 lignes.
- Recommandations finales: le moteur Lot 3 reste limite a 3.
- Timeout par defaut: 1500 ms.
- Annulation: `abortSignal` est attache si le transport le supporte.
- Pagination non bornee: absente.
- Retry automatique: absent.

## Observabilite sure

Evenements codes uniquement:

- debut de lecture;
- succes;
- timeout;
- erreur RLS;
- erreur reseau;
- ligne rejetee;
- fallback;
- erreur de schema.

Les evenements ne contiennent ni JWT, ni cle, ni coordonnees exactes, ni texte utilisateur complet,
ni reponse brute Supabase, ni donnee personnelle.

## Micro-validation reelle

Non executee. Raison: aucune cle publique/anon exploitable n'etait disponible localement; seules des
cles privilegiees etaient presentes et elles sont interdites par ce lot. Verdict compatible:
`SUPABASE_READ_ADAPTER_READY_WITH_LIVE_VALIDATION_PENDING`.

Plan de validation live autorise des qu'une cle publique est fournie:

1. SELECT projection Lot 4, `status=eq.active`, `is_active=eq.true`, `limit=5`.
2. SELECT minimal `id,status,is_active`, `status=neq.active`, `limit=5`, attendu vide via le chemin public.
3. SELECT projection Lot 4 avec filtre ville ou identifiant masque, `limit=5`.

Aucune fiche complete ne doit etre imprimee; uniquement des agrégats et identifiants masques.

## Tests locaux

La suite simule:

1. lecture active valide;
2. pending exclu;
3. inactive exclu;
4. statut inconnu;
5. limite par defaut;
6. limite maximale;
7. refus limite trop haute;
8. selection explicite;
9. absence de `select("*")`;
10. absence de methode d'ecriture;
11. propriete inconnue;
12. identifiant invalide;
13. coordonnees invalides;
14. note invalide;
15. service non structure;
16. accessibilite inconnue;
17. engagement sans preuve officielle;
18. doublon d'identifiant;
19. timeout;
20. erreur reseau;
21. erreur RLS;
22. reponse mal formee;
23. tableau vide;
24. quarantaine partielle;
25. trop de lignes invalides;
26. aucune donnee personnelle dans les logs;
27. aucune cle dans les logs;
28. aucun texte utilisateur complet dans les logs;
29. integration moteur deterministe;
30. sorties identiques pour entrees identiques.

Un test supplementaire valide les filtres bornes et `AbortSignal`.

## Lot 5 recommande

Lot 5 doit connecter cet adaptateur a une orchestration serveur non deployee, toujours sans LLM:

1. fournir une cle publishable/anon de test;
2. executer les trois SELECT de micro-validation;
3. brancher `runYootChatWithMerchantReadPort` dans un handler serveur local;
4. conserver la fonction YootChat v4 deployee intacte;
5. comparer reponse deterministe locale et future reponse Edge Function sans OpenAI;
6. seulement ensuite evaluer l'introduction controlee d'un LLM.

## Verdict

SUPABASE_READ_ADAPTER_READY_WITH_LIVE_VALIDATION_PENDING
