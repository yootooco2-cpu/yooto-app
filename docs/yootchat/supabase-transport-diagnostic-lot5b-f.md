# YootChat - Lot 5B-F diagnostic hors ligne du transport Supabase

Date: 2026-07-20

## Source Git

- Branche source: `test/yootchat-runtime-live-certification`
- Commit source: `6a3b52d12f344b00ef8384a7cd8b3247e664563b`
- Parent source: `1ca74559bf5055066ec59d0a3f3a56f93db3aa01`
- Branche de diagnostic: `diagnostic/yootchat-supabase-transport-offline`

## Preconditions

- Worktree propre avant creation de branche: oui.
- Lecture volontaire de `.env.local` par le diagnostic transport: non.
- Utilisation de configuration reelle: non.
- Appel reseau reel: non.
- SELECT Supabase reel: 0.
- OpenAI: 0.
- Deploiement: 0.
- Ecriture Supabase: 0.

## SDK local inspecte

- Package: `@supabase/supabase-js`
- Version locale: `2.108.2`
- Mode de test: `createClient` officiel avec `fetch` injecte et intercepteur local.
- Donnees utilisees: URL factice, cle publishable factice, reponses synthetiques.

Faits constates dans le SDK local:

- `fetchWithAuth` ajoute `apikey` si absent.
- `fetchWithAuth` ajoute aussi `Authorization` si absent.
- Sans session utilisateur, le token de secours utilise pour `Authorization` est la cle fournie au client.
- Le client REST interne est construit sur `rest/v1`.
- Le client Supabase ne transmet pas d'option locale de desactivation des retries PostgREST dans ce chemin.
- `postgrest-js` applique une logique de retry sur erreurs reseau GET.
- Les erreurs d'abandon sont converties par `postgrest-js` en reponse d'erreur avec statut transport `0` et code vide avant d'arriver a l'adaptateur.

## Construction de requete confirmee hors ligne

- REQUEST_COUNT=1
- METHOD=GET
- URL_TARGET=REST_MERCHANTS
- APIKEY_HEADER_PRESENT=true
- AUTHORIZATION_HEADER_PRESENT=true
- AUTHORIZATION_HEADER_TYPE=PUBLISHABLE
- ACCEPT_HEADER_PRESENT=true
- ACCEPT_PROFILE_PUBLIC=true
- SELECT_EXPLICIT=true
- SELECT_STAR_USED=false
- FILTER_STATUS_ACTIVE=true
- FILTER_IS_ACTIVE_TRUE=true
- ORDER_DETERMINISTIC=true
- LIMIT=5
- ABORT_SIGNAL_PRESENT=true

Interpretation:

- La presence de `Authorization: Bearer <publishable>` est un fait de construction du SDK local.
- Cette presence n'est pas prouvee comme cause racine du blocage live.
- La requete metier cible bien `/rest/v1/merchants`.

## Simulations synthetiques

| Scenario | Statut synthetique | Code technique synthetique | Categorie adaptateur | Fallback | Requetes interceptees | Terminal runtime |
| --- | ---: | --- | --- | --- | ---: | --- |
| HTTP compatible minimal | 200 | NONE | NONE | NONE | 1 | HARNESS_COMPLETED |
| Cle/API refusee | 401 | HTTP_401_KEY_REFUSED | SUPABASE_NETWORK_ERROR | SERVICE_UNAVAILABLE | 1 | HARNESS_COMPLETED |
| JWT/PostgREST refuse | 401 | PGRST301 | SUPABASE_NETWORK_ERROR | SERVICE_UNAVAILABLE | 1 | HARNESS_COMPLETED |
| Permission PostgreSQL | 403 | 42501 | SUPABASE_RLS_DENIED | SERVICE_UNAVAILABLE | 1 | HARNESS_COMPLETED |
| Schema ou colonne inconnue | 400 | 42703 | SUPABASE_NETWORK_ERROR | SERVICE_UNAVAILABLE | 1 | HARNESS_COMPLETED |
| Erreur reseau TypeError | 0 | TYPE_ERROR | HARNESS_TIMEOUT | NONE | 1 | HARNESS_TIMEOUT |
| Abort/timeout SDK | 0 | EMPTY_CODE | SUPABASE_NETWORK_ERROR | SERVICE_UNAVAILABLE | 1 | HARNESS_COMPLETED |

## Diagnostic

Cause racine live:

- Non prouvee par ce diagnostic hors ligne.

Cause technique prouvee:

- Le code actuel regroupe plusieurs erreurs PostgREST non-`42501` sous `SUPABASE_NETWORK_ERROR`.
- Un HTTP 401 synthetique et un HTTP 400 synthetique produisent tous deux `SUPABASE_NETWORK_ERROR`.
- Un abort transforme par `postgrest-js` en erreur a code vide produit aussi `SUPABASE_NETWORK_ERROR`.
- Une vraie erreur reseau `TypeError` peut entrer dans la fenetre de retry interne du SDK et finir coupee par le timeout harnais.

Conclusion:

- Le resultat live Lot 5B-E `SUPABASE_NETWORK_ERROR` n'identifie pas a lui seul une panne reseau.
- Il peut masquer au minimum une erreur d'authentification HTTP, une erreur JWT/PostgREST, une erreur de schema ou une erreur d'abandon transformee.
- Le diagnostic le plus solide est un trou de classification et d'observabilite anonymisee, pas une cause Supabase unique.

## Correction minimale recommandee

- Ajouter une classification anonymisee des erreurs PostgREST avant toute nouvelle tentative live.
- Conserver uniquement des categories: `AUTH_REJECTED`, `SCHEMA_REJECTED`, `RLS_DENIED`, `TIMEOUT`, `NETWORK_TRANSPORT`, `UNKNOWN`.
- Conserver le statut HTTP ou le code technique nettoye dans l'agregat autorise, sans reponse brute.
- Evaluer separement la politique de retry interne du SDK pour respecter strictement les futures contraintes de tentative unique.
- Ne pas retirer `Authorization` uniquement sur la base de ce diagnostic: sa presence est prouvee, sa responsabilite ne l'est pas.

## Validations hors ligne

- Nouveau test transport: vert.
- Scenarios synthetiques: 7/7 couverts.
- Appel reseau reel: 0.
- SELECT reel: 0.
- Donnees brutes affichees: 0.
- Secret affiche: 0.
- URL complete affichee: 0.
- Nom, identifiant ou coordonnee reelle affiche: 0.
- TypeScript cible sur le nouveau test: vert.
- ESLint cible sur le nouveau test: vert.
- Suite complete Jest: verte.
- TypeScript global: echec hors perimetre sur erreurs preexistantes.
- ESLint global: echec hors perimetre sur erreurs preexistantes; la commande Expo a charge automatiquement les noms de variables `.env.local` sans afficher de valeur.

## Verdict

`SUPABASE_ERROR_CLASSIFICATION_GAP_PROVEN`
