# YootChat - Lot 5A runtime orchestration locale

Date: 2026-07-20

## Source et filiation

- Branche source: `feat/yootchat-supabase-live-validation`
- Commit source obligatoire: `9cc68fa068308204774ace79bd5e3cff131e03c9`
- Base Lot 4: `89ad6d06eb0d16efa119e0f7f2eedb077dc28bc5`
- Verdict source: `SUPABASE_READ_ADAPTER_CERTIFIED_WITH_ACCESSIBILITY_UNKNOWN`
- Branche Lot 5A: `feat/yootchat-runtime-orchestration`

Aucun appel live Supabase n'est effectue pendant ce lot.
Aucune fonction Edge YootChat, aucun Chat social et aucune UI ne sont modifies.

## Architecture creee

Point d'entree cree: `src/features/yootchat/runtime.ts`.

Le runtime expose:

- `createYootChatRuntime`;
- `YootChatRuntime.execute(request, filters?)`;
- `resolveYootChatPublicSupabaseKey`.

Flux reel:

`YootChatRequest -> createYootChatSupabaseReadAdapter -> Supabase read port -> projection/quarantaine -> runYootChatWithMerchantReadPort -> moteur deterministe -> reponse certifiee ou fallback`

Le runtime ne duplique:

- ni validation de ligne;
- ni projection;
- ni quarantaine;
- ni classement;
- ni construction de preuve;
- ni fallback.

Il compose uniquement les briques certifiees des Lots 3 et 4.

## Fichiers crees ou modifies

| Fichier | Statut | Role |
| --- | --- | --- |
| `src/features/yootchat/runtime.ts` | cree | service local d'orchestration et resolution de cle publique |
| `src/features/yootchat/runtime.test.ts` | cree | tests Lot 5A sans reseau |
| `docs/yootchat/runtime-orchestration-lot5a.md` | cree | rapport neutre Lot 5A |
| `src/features/yootchat/index.ts` | modifie | export public du runtime |

Le singleton global `src/lib/supabase/client.ts` n'est pas modifie. Ce choix evite tout changement
silencieux sur Auth, Transit et les autres usages applicatifs de Supabase.

## Politique de configuration publique

La resolution de cle YootChat est pure et testable localement:

1. preferer `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` si elle est presente;
2. accepter `EXPO_PUBLIC_SUPABASE_ANON_KEY` seulement en repli;
3. accepter la cle legacy seulement si le JWT local contient `role=anon`;
4. refuser `sb_secret_...`;
5. refuser `service_role`;
6. refuser les formats inconnus;
7. ne jamais journaliser la cle ou l'URL complete.

La resolution ne cree aucun client, ne fait aucun `fetch` et ne lit aucune cle privilegiee.

## Invariants et fallbacks

- Lecture Supabase: projection explicite uniquement, jamais `select("*")`.
- Limite par defaut: 30 lignes.
- Limite maximale: 100 lignes.
- Timeout: 1 500 ms.
- Filtres serveur obligatoires: `status=active` et `is_active=true`.
- Accessibilite issue de Supabase: toujours `UNKNOWN`.
- Services et equipements: tableaux vides tant qu'aucune preuve structuree n'existe.
- Engagements officiels: conserves uniquement quand les booleens publics sont valides.
- Trop de lignes invalides: fallback `SERVICE_UNAVAILABLE`.
- Aucune ligne active: fallback `NO_RESULT`.
- Timeout: `SUPABASE_TIMEOUT`.
- RLS refusee: `SUPABASE_RLS_DENIED`.
- Panne reseau: `SUPABASE_NETWORK_ERROR`.
- Reponse mal formee: `MALFORMED_RESPONSE`.
- Moteur non certifiable: `ENGINE_UNCERTIFIED`.

Les observations restent limitees a des codes et agregats. Elles ne contiennent ni secret, ni texte
utilisateur, ni identifiant, ni coordonnee.

## Tests Lot 5A

Tests runtime locaux:

- succes lecture -> moteur -> reponse certifiee;
- une seule lecture bornee;
- determinisme a entree identique;
- quarantaine d'une ligne invalide sans contamination;
- fallback si trop de lignes invalides;
- fallback si aucune ligne active;
- timeout, RLS, panne reseau et reponse mal formee;
- moteur non certifiable;
- longueurs de demande 0, 800 et 801 caracteres;
- maximum trois recommandations;
- accessibilite Supabase toujours `UNKNOWN`;
- engagements officiels structures;
- filtres bornes sans SQL arbitraire;
- absence de fuite dans les observations;
- preference de la cle publishable sur la cle anon;
- compatibilite cle anon legacy seule;
- refus des cles secretes, privilegiees ou inconnues;
- absence de dependance React Native et absence de fetch direct dans le service.

## Resultats de validation

- Tests runtime Lot 5A: 18 reussis.
- Tests YootChat cibles: 180 reussis.
- Suite complete: 919 reussis, 6 ignores, 0 echec.
- TypeScript cible YootChat: 0 erreur.
- ESLint cible YootChat: 0 erreur.
- `git diff --check`: 0 erreur.
- Scan secrets: aucune valeur de cle detectee; seules les mentions textuelles de refus
  `sb_secret_...` et `service_role` apparaissent dans le code de defense.
- Scan ecritures/RPC/OpenAI/fetch direct: aucune ecriture executable, aucun RPC, aucun OpenAI,
  aucun fetch direct ajoute dans le runtime.
- Perimetre Git: runtime, tests runtime, export YootChat et rapport Lot 5A uniquement.

## Risques et limites restantes

- Le runtime attend un client Supabase deja construit par l'application.
- La fabrique globale applicative n'est pas modifiee pendant ce lot pour eviter une regression hors
  perimetre.
- Le Lot 5A ne prouve pas un appel live de bout en bout; cette preuve est reservee au Lot 5B.
- L'accessibilite reste volontairement inconnue tant qu'aucune colonne publique probante n'existe.
- Aucun LLM n'est connecte et aucun enrichissement semantique n'est ajoute.

## Cout reel

0 euro.

## Verdict

YOOTCHAT_RUNTIME_ORCHESTRATION_READY

## Recommandation Lot 5B

Autoriser une unique execution live de bout en bout, bornee a 5 lignes, avec rapport strictement
agrege: statut, lignes lues, projections acceptees, quarantaines, recommandations, fallback et
duree par tranche.
