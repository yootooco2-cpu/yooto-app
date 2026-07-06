# YOOTOO — Plan d'exécution : nouveau parcours d'inscription

> Mode exécution. Petites PR **indépendantes, testables, mergeables**, chacune laissant `main`
> **stable** et **démontrable**. Aucun code tant que le plan n'est pas validé. Fondé sur l'état réel
> de `main` (fondations A/B présentes ; favoris en mémoire ; client Supabase data-only) et l'ADR-001
> (pas de mot métier ; **User Data Store** identity-aware qui étend `src/lib/data`).

## Housekeeping (avant PR 1 — pas du code applicatif)
- **Merger #78** (Blueprint + ADR-001) : la spec validée entre dans `main`.
- **Fermer #76** (mega-branche prototype) : son code est **récolté** dans PR 1–4 → on évite la grosse branche que tu refuses.
- **#75 (logo)** : mergeable indépendamment ; la sheet d'auth (PR 4) gagne le moment de marque quand il atterrit — elle fonctionne sans.
- **#23–26** (anciennes) : à revoir/fermer (dette de flux), hors de ce chantier.

## Ordre recommandé (et pourquoi il diffère de l'exemple)
1. **Google/Apple/Email = UNE seule PR** (PR 4), pas trois : le code est partagé, seuls les toggles dashboard diffèrent → 3 PR seraient artificielles.
2. **Favoris serveur + identité anonyme AVANT l'upgrade** (PR 3 avant PR 4) : ainsi le « Zéro perte » est **réel** au moment du link (les favoris existent déjà côté serveur). L'inverse livrerait un upgrade qui ne préserve rien.
3. **La session anonyme n'est pas une PR isolée** : elle naît dans le PR de son **premier client** (favoris) — conforme à l'ADR (propriété du store, pas un événement à part).
4. **Conflit/fusion isolé en dernier** (PR 6, risque élevé) pour ne jamais bloquer le parcours nominal.

---

## PR 1 — Câblage de session (client auth + `useSession`)
- **Objectif** : activer l'auth Supabase (persistSession + refresh + PKCE) avec stockage sécurisé, + hook `useSession()`. **Aucun changement d'UX.**
- **Fichiers** : `src/lib/supabase/client.ts` (persistSession/storage), `src/lib/supabase/authStorage.ts` (nouveau, récolté de #76), `src/features/auth/useSession.ts` (nouveau).
- **Dépendances** : aucune.
- **Risques** : faible. Le fetch commerces lit toujours en **anon** quand déconnecté (RLS lecture publique inchangée) → à vérifier.
- **Critères d'acceptation** : app démarre ; liste commerces OK (anon) ; `useSession()` = null hors session ; tsc/jest/export verts.
- **Tests** : unit `authStorage` (chunking) + `useSession` (déconnecté) ; smoke : commerces s'affichent.
- **Complexité** : **S**.

## PR 2 — Schéma identité (migration 004)
- **Objectif** : `profiles` (1:1 `auth.users`) + `user_roles` + trigger `on_auth_user_created` + RLS deny-by-default. **Inerte** sans utilisateur.
- **Fichiers** : `supabase/migrations/004_identity_core.sql` (récolté de #76).
- **Dépendances** : aucune runtime ; **pré-requis** : appliquer la migration (tâche dashboard).
- **Risques** : faible (inerte). Compat avec `merchant_users` existant à confirmer.
- **Critères** : migration s'applique sans erreur ; `profiles`/`user_roles` + RLS présents ; lecture commerces anon toujours OK.
- **Tests** : application migration (CI/dry-run) ; RLS : un anon ne lit pas `profiles`.
- **Complexité** : **S**.

## PR 3 — User Data Store + favoris serveur + identité anonyme paresseuse
- **Objectif** : persister les favoris **côté serveur** ; **matérialiser une identité anonyme au 1er favori** (invariant du store), **local-first**, sans friction → **Zéro perte** pour les favoris dès maintenant.
- **Fichiers** : `supabase/migrations/005_favorites.sql` (nouveau : `favorites(profile_id, merchant_id)` + RLS self) ; `src/lib/data/*` (capacité identity-aware / `userDataStore`) ; `src/features/auth/ensureIdentity.ts` (`signInAnonymously`) ; `src/features/favorites/favoritesStore.ts` (lecture/écriture serveur si session, **fallback local** sinon + hydratation).
- **Dépendances** : PR 1, PR 2.
- **Risques** : **moyen**. Changement du store favoris → garder **fallback local** (offline/non configuré) = pas de régression invité ; réconciliation local→serveur.
- **Critères** : invité → j'ajoute un favori → session anonyme créée en arrière-plan → favori **persiste après reload** ; hors ligne → local puis sync ; commerces toujours OK.
- **Tests** : unit (mapping local↔serveur, `ensureIdentity` idempotent), intégration mockée ; **démo vidéo** : add favori → reload → présent.
- **Complexité** : **M/L** (cœur Zéro-Perte).

## PR 4 — Sheet d'auth juste-à-temps + connexion/upgrade (tous providers)
- **Objectif** : **une seule** surface d'auth (bottom sheet) : Google · Apple (iOS) · Email (**1 champ**, lien magique). Si session **anonyme** → `linkIdentity` (upgrade **zéro perte**) ; sinon connexion. Câblée sur Profil « Se connecter ».
- **Fichiers** : `src/lib/supabase/authActions.ts` (récolté : provider/link/otp) ; `src/features/auth/AuthSheet.tsx` (nouveau, dérivé de #76 mais **email simplifié à 1 champ**) ; `src/app/(tabs)/profile.tsx` (bouton → sheet) ; enregistrement route/modal.
- **Dépendances** : PR 1, PR 2, PR 3 (linking depuis anonyme). Logo #75 = enrichissement optionnel.
- **Risques** : **moyen-élevé** (OAuth natif/web, PKCE, linking). Garde `isSupabaseConfigured` ; **pré-requis** : providers activés côté dashboard.
- **Critères** : anonyme + 2 favoris → sheet → « Continuer avec Google » → compte permanent, **favoris intacts** ; email = 1 champ ; annulation → reste anonyme, rien perdu ; Apple masqué hors iOS.
- **Tests** : unit authActions (gardes) ; e2e manuel/**vidéo** par provider.
- **Complexité** : **M**.

## PR 5 — Déclencheurs JIT (prompts d'upgrade contextuels)
- **Objectif** : proposer l'upgrade au bon moment (seuil de favoris, ouverture profil…), **jamais bloquant**, « plus tard » **persistant** via les **milestones** (fondation B).
- **Fichiers** : `src/features/auth/upgradePrompts.ts` (règles/priorités) ; consommation `useLaunchStore` ; points d'accroche (favoris, profil).
- **Dépendances** : PR 4, fondation B.
- **Risques** : faible-moyen (ne pas harceler).
- **Critères** : après N favoris → prompt dismissable ; « plus tard » ne réapparaît pas.
- **Tests** : unit (règles), démo.
- **Complexité** : **S/M**.

## PR 6 — Conflit / fusion (link vers identité existante)
- **Objectif** : si l'identité liée appartient déjà à un autre compte → « Se connecter à ce compte » + **fusion** des données anonymes (Edge Function transactionnelle).
- **Fichiers** : `supabase/functions/merge-account/*` ; `authActions` (détection conflit) ; UI de reprise.
- **Dépendances** : PR 4, PR 3.
- **Risques** : **élevé** (intégrité/transactions) → isolé volontairement en dernier.
- **Critères** : conflit géré **sans perte ni doublon** ; refus → données anonymes orphelines (TTL).
- **Tests** : intégration Edge Function, scénarios de fusion.
- **Complexité** : **L**.

## PR 7 — Polish & finition
- **Objectif** : logo dans la sheet (quand #75 mergé) · copy · états d'erreur/reprise complets · `prefers-reduced-motion` · états vides · stubs télémétrie (en attendant l'Event Bus) · TTL comptes anonymes (job).
- **Dépendances** : PR 4–6, #75.
- **Risques** : faible.
- **Complexité** : **S/M**.

---

## Valeur livrée par étape (le parcours devient utilisable tôt)
- **Après PR 3** : les favoris **survivent** (invité → anonyme invisible) → Zéro perte réel, sans aucun écran d'inscription.
- **Après PR 4** : l'utilisateur peut **passer en compte permanent** en 2 taps / 0 champ, **favoris intacts** → le parcours est **fonctionnel de bout en bout**.
- **PR 5–7** : orchestration fine, cas limites, polish.

## Invariants transverses (à chaque PR)
- `main` reste **stable** ; **aucune régression** (fallback local si Supabase non configuré/offline).
- Chaque PR **démontrable** : test unitaire **toujours** ; démo live (vidéo) dès que providers/migrations appliqués.
- Discipline : PR ≤ ~1 jour ; on attend ta validation **avant chaque merge**.
