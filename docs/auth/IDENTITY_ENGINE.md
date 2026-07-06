# YOOTOO — Identity Engine (architecture d'identité)

> Document d'architecture. **Aucun code d'implémentation** ici : décisions, modèle de données,
> flux, risques, alternatives, recommandation. Objectif : tenir **plusieurs années** sans refonte
> quand on ajoute de nouveaux types de comptes ou de nouveaux moyens d'authentification.

## 0. Le principe fondateur (on remet en cause l'évidence)

L'erreur classique : confondre **le login**, **la personne**, **le rôle** et **l'organisation**.
On les sépare en **4 couches** indépendantes :

| Couche | Question | Objet |
|---|---|---|
| **Credential / Identity** | « Comment tu prouves qui tu es » | `auth.users` + `auth.identities` (Google, Apple, email, téléphone, **wallet**) |
| **Person** | « Qui tu es » (ancre stable) | `profiles` (1:1 `auth.users`) |
| **Rôles plateforme** | « Ce que tu as le droit de faire globalement » | `user_roles` (M:N) — individual, ambassadeur, admin |
| **Entités & appartenance** | « Au nom de quelle Maison tu agis » | `entities` (commerçant/producteur/collectivité) + `entity_members` |

**Conséquence directe** : un particulier qui devient commerçant ne crée **pas** un nouveau compte —
il obtient une **entité** + une **appartenance**. Un ambassadeur = un **rôle** sur la même personne.
Un nouveau type de compte = une nouvelle valeur d'`entity.type` ou de rôle → **zéro refonte auth**.

C'est le modèle « personne ↔ organisations » (Slack/Stripe/Shopify), pas le modèle « 1 rôle par login ».

## 1. Réponses directes aux questions posées

### 1.1 Plusieurs types de comptes (particulier, commerçant, producteur, collectivité, admin, ambassadeur)
- Les types **métier** (commerçant/producteur/collectivité) sont des **entités** (`entities.type`), pas des rôles sur la personne. Une personne y est **membre** (`owner`/`manager`/`staff`).
- Les types **plateforme** (individual/ambassadeur/admin) sont des **rôles** (`user_roles`, M:N) → une personne peut être « individual + ambassadeur ».
- Les permissions dérivent des rôles + appartenances (RBAC), injectées dans le **JWT** (voir §4) et **appliquées par RLS**.

### 1.2 Préparer le wallet Web3 sans refaire l'auth
- Le wallet n'est **pas** un compte séparé : c'est **une identité de plus** rattachée à la **même personne** (au même titre que Google/Apple).
- On construit **dès aujourd'hui** la primitive d'**account-linking** (plusieurs credentials → une personne). Le wallet s'y branchera : SIWE (Sign-In With Ethereum) / Sign-In With Solana, nonce + signature vérifiés dans une **Edge Function**, puis `linkIdentity`.
- Table `wallet_addresses(profile_id, chain, address, verified_at, is_primary)` — non-custodial (on stocke **l'adresse publique**, jamais de clé). Sert aussi aux récompenses/impact on-chain plus tard.

### 1.3 Google puis Apple (ou l'inverse) sans doublon
- Supabase modélise **plusieurs `auth.identities` sous un seul `auth.users`**. Google + Apple + email = **une seule personne** si on les **lie**.
- **Prévention** (préférée) : liaison automatique **par email vérifié** (Google et Apple fournissent un email vérifié) — activée **uniquement** si l'email est vérifié.
- **Piège Apple** : « Hide My Email » renvoie un **email-relais** → l'email ne matche pas Google. Clé stable = le `sub` Apple. Dans ce cas, pas d'auto-match → **fusion manuelle** (§1.4).
- Ajout explicite depuis un compte connecté : `linkIdentity({ provider })` → rattache au `auth.users` courant.

### 1.4 Fusion de comptes (account linking / identités multiples)
- **Prévenir plutôt que fusionner** : lier au sign-in par email vérifié + `linkIdentity`.
- Quand un doublon existe (relais Apple vs email Google) : **flux de fusion** :
  1. Authentifié en A, l'utilisateur demande à fusionner B.
  2. **Preuve de possession de B** (OTP sur l'email de B / ré-auth du provider de B).
  3. **Edge Function (service_role)** : repointe toutes les FK `profile_id` de B → A en **transaction**, déplace les `auth.identities` de B, puis **soft-delete** B avec `merged_into = A` (audit).
- **Décision de schéma clé** : **toute table métier référence `profile_id`** (jamais `auth.users.id` en dur) → la fusion = repointage, pas une migration.

### 1.5 Organisation des tables Supabase (évolutif plusieurs années)
Voir §3. En bref : `auth.users`/`auth.identities` (managés) · `profiles` (personne) · `user_roles`
(rôles plateforme M:N) · `entities` + `entity_members` (orgs & appartenance) · `role_permissions`
(RBAC fin, optionnel) · `preferences` · `onboarding_state` · `wallet_addresses` · `account_merges`
(audit) · `audit_events`. RLS partout, opérations privilégiées en **`security definer`**.

### 1.6 Sessions, récupération, changement d'email, sécurité
- **Sessions** : JWT court (≈1 h) + refresh **rotatif**. Natif → refresh token en **`expo-secure-store`** (jamais AsyncStorage). Web → cookie `httpOnly` (SSR) sinon stockage prudent. Auto-refresh activé.
- **Récupération** : lien magique / OTP sur email vérifié ; codes de secours. Un compte **wallet-only** n'a pas d'email → **exiger au moins un email/social** comme canal de secours.
- **Changement d'email** : `updateUser({ email })` → double confirmation (ancien + nouveau) ; re-vérification.
- **Sécurité** : PKCE sur OAuth · validation stricte des **deep links** natifs · **MFA (TOTP)** pour rôles privilégiés (admin/commerçant) · rôles **jamais** de confiance côté client → **custom access token hook** signe les claims · RLS sur tout · **rate-limiting** · audit log · RGPD (soft-delete + anonymisation).

## 2. Flux d'authentification (schémas)

### 2.1 Inscription / connexion (OAuth ou email)
```
App ──(1) signInWithOAuth / signInWithOtp──▶ Provider (Google/Apple) / Email
Provider ──(2) callback + tokens──▶ Supabase Auth ──(3) crée/retrouve auth.users
   │                                        │
   │                              (4) trigger on_auth_user_created
   │                                        ▼
   │                        public.profiles (personne)  +  user_roles(individual)
   ▼                                        │
Session (JWT+refresh) ◀──(5) claims via access-token hook (roles, memberships)
   │
   └─(6) profile.onboarding_completed ? ─── non ─▶ Onboarding ─▶ Découverte (/)
```

### 2.2 Lier une 2e identité (Google → Apple)
```
Connecté (auth.users A) ─ linkIdentity('apple') ─▶ Apple ─▶ nouvelle auth.identities rattachée à A
(email vérifié identique → auto-link possible au sign-in ; sinon lien explicite ci-dessus)
```

### 2.3 Fusion de comptes (doublon relais Apple / email Google)
```
Authentifié A ─ demande fusion B ─▶ Preuve possession B (OTP/ré-auth)
   ─▶ Edge Function (service_role, transaction) :
        repoint FK profile_id: B → A  (favoris, memberships, préférences, wallets, rewards)
        move auth.identities: B → A
        B.status = merged, B.merged_into = A   (soft-delete, audit)
```

### 2.4 Wallet Web3 (futur, sans refonte)
```
Connecté ─ connect wallet ─▶ SIWE: serveur émet nonce ─▶ user signe ─▶
Edge Function vérifie signature ─▶ wallet_addresses(profile_id, address, verified_at)
(= une identité/credential de plus sur la MÊME personne)
```

## 3. Modèle de données recommandé

> `auth.*` = managé par Supabase. `public.*` = notre schéma. RLS activée partout.

```
auth.users (id) 1───1 public.profiles (id = auth.uid)
auth.identities (user_id, provider, provider_id)   ── plusieurs par auth.users

public.profiles
  id uuid PK (= auth.uid)
  display_name, avatar_url, locale, primary_email
  onboarding_completed_at, marketing_consent
  status ('active'|'merged'|'deleted'), merged_into uuid null
  created_at, updated_at

public.user_roles              -- rôles PLATEFORME (M:N)
  profile_id → profiles.id, role ('individual'|'ambassador'|'admin')
  granted_by, granted_at   (PK: profile_id+role)

public.entities                -- Maisons / orgs métier
  id uuid PK, type ('merchant'|'producer'|'collectivity')
  name, status ('draft'|'pending'|'verified'), verified_at
  (lien vers la donnée commerce existante)

public.entity_members          -- appartenance personne ↔ entité
  entity_id → entities.id, profile_id → profiles.id
  role ('owner'|'manager'|'staff'), status  (PK: entity_id+profile_id)

public.role_permissions        -- RBAC fin (optionnel, évolutif)
  role, permission

public.preferences             -- préférences (existant discovery) — 1:N ou JSONB
  profile_id → profiles.id, key, value

public.onboarding_state
  profile_id, step, completed_at   (ou JSONB sur profiles)

public.wallet_addresses         -- futur Web3
  profile_id, chain, address, verified_at, is_primary

public.account_merges           -- audit des fusions
  from_profile, into_profile, performed_by, performed_at, reason

public.audit_events             -- journal sécurité (login, grant, merge, email change)
  profile_id, type, meta jsonb, created_at
```

**Règle d'or** : toute table métier possède `profile_id → profiles.id` (jamais `auth.users.id`
en dur) → fusion = repointage. `profiles.id = auth.uid` garde les **policies RLS simples**
(`auth.uid() = profile_id`) tout en restant fusionnable.

## 4. Choix techniques argumentés

- **Supabase Auth comme fournisseur d'identité** : intégration native RLS, multi-identités par
  utilisateur, coût faible, portable. On **n'invente pas** de système maison.
- **Claims dans le JWT via *custom access token hook*** : à chaque émission de token, une fonction
  de confiance injecte `app_metadata.roles` + `memberships` → RLS rapide et **non falsifiable côté client**.
- **RLS partout + `security definer`** pour les opérations privilégiées (fusion, octroi de rôle).
- **Personne = ancre** (`profiles`), credentials interchangeables → **wallet ready**.
- **Entités + appartenance** (pas « 1 rôle par login ») → nouveaux types de comptes sans refonte.
- **PKCE**, deep-links validés, **SecureStore** pour les tokens natifs.

## 5. Risques identifiés
1. **Auto-link par email** : risque d'usurpation si un provider renvoie un email non vérifié → **lier uniquement sur email vérifié**.
2. **Apple private relay** casse le matching par email → prévoir la **fusion manuelle**.
3. **Doublons** (emails différents) → schéma pensé pour la fusion (`profile_id` partout).
4. **Escalade de privilèges** si rôles de confiance côté client → **hook serveur + RLS**.
5. **Perte de clé Web3** (pas de récupération) → **exiger un canal email/social** de secours.
6. **Erreurs RLS** = fuite de données → tests de policies, revues, `deny by default`.
7. **RGPD** : droit à l'effacement vs audit → **soft-delete + anonymisation**, pas de hard-delete.
8. **Lock-in Supabase** → l'abstraction « personne/entités/rôles » reste **IdP-agnostique** (swap possible).

## 6. Alternatives évaluées

| Option | Avantages | Inconvénients | Verdict |
|---|---|---|---|
| **Supabase Auth + schéma personnes/entités/rôles** | Natif RLS, multi-identités, coût faible, évolutif | RBAC/orgs à modéliser soi-même | ★ **Recommandé** |
| Table `persons` distincte de `auth.users` (M:N) | Fusion triviale, multi-auth par personne | RLS indirecte (fonction `current_person_id`), + complexe | Alternative « max évolutivité » si les doublons deviennent fréquents |
| IdP tiers (Clerk / WorkOS / Auth0) devant Supabase | Orgs/RBAC/SSO entreprise clés en main, linking géré | Coût, 2e vendor, pont JWT ↔ RLS | À considérer **si SSO entreprise** devient prioritaire |
| Auth maison | Contrôle total | Insécurité, coût, réinvention | ✗ Écarté |

## 7. Recommandation finale

**Identity Engine en 4 couches sur Supabase Auth :**
1. **Credentials** via Supabase (`auth.users`/`auth.identities`) — email, Google, Apple, téléphone, **puis wallet** — en exploitant le **multi-identités par utilisateur** (zéro doublon quand lié par email vérifié).
2. **`profiles` = personne**, ancre stable ; toute donnée métier référence `profile_id`.
3. **Rôles plateforme** (`user_roles`, M:N) + **entités/appartenance** (`entities`/`entity_members`) pour commerçant/producteur/collectivité.
4. **Claims dans le JWT** (access-token hook) → **RLS** applique les permissions.
5. **Account-linking first-class** (`linkIdentity` + auto-link email vérifié + **fusion** en Edge Function) — construit **dès la Phase 2** pour que **wallet** et futurs providers s'y branchent sans refonte.
6. **Sessions** SecureStore/cookies, refresh rotatif, **MFA** pour rôles sensibles, **audit log**, **RGPD** soft-delete.

**Ordre d'implémentation suggéré (Phase 2+) :**
1. `profiles` + trigger de création + rôle `individual` par défaut + RLS de base.
2. Providers Google/Apple/email (OTP) + persistance session.
3. Access-token hook (claims) + policies RLS par rôle.
4. `entities` + `entity_members` (onboarding commerçant/producteur).
5. Primitive d'account-linking + flux de fusion.
6. `wallet_addresses` + SIWE (quand le besoin Web3 arrive).

Cette architecture absorbe **de nouveaux types de comptes** (rôle/entité) et **de nouveaux moyens
d'authentification** (identité/credential) **sans refonte** de l'auth.
