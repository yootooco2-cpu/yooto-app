# YOOTOO — Blueprint du parcours d'entrée & d'inscription

> Conception produit. **Aucun code.** Objectif : un blueprint si solide que l'implémentation
> devient mécanique. Stratégie validée : **Invité → Anonyme (Supabase) → Authentifié**, avec
> **auth juste-à-temps** et **zéro perte**. Principes : *Invisible First · Progressive Identity ·
> Zero Loss · One Tap · Emotional Flow*.

## 0. Le pari central (décision produit + technique)

**Anonyme PARESSEUX, pas eager.** On reste **invité local** au lancement (aucun réseau, aucun
compte). La session **anonyme Supabase** n'est créée qu'au **premier acte qui mérite d'être
conservé** (1er favori), puis on **migre** l'état local vers elle. Puis, plus tard et seulement
si l'utilisateur y trouve un intérêt, on **upgrade** l'anonyme en compte permanent via
`linkIdentity` — **même `auth.users.id`** → aucune donnée déplacée, aucune perte.

Pourquoi paresseux : moins de comptes anonymes « junk », rien au démarrage (Invisible First),
mais **zéro perte** dès l'action qui compte.

## 1. Parcours complet — de l'ouverture au 1er favori

```
[GUEST · local]
Ouverture à froid (pas de splash)
  └─ Device Context lu en silence (langue, thème, région) — RIEN n'est demandé
  └─ App utilisable IMMÉDIATEMENT (Accueil → Carte)            ⏱ time-to-use = 0 s
Exploration libre (carte, catégories, fiches) — 100 % local, aucun compte

Tap ❤️ sur une fiche commerce  ── JIT PERSISTENCE (silencieux) ─────────────┐
  1. UI optimiste : le favori s'affiche INSTANTANÉMENT (0 attente)          │
  2. En arrière-plan : signInAnonymously() si pas de session   ~200 ms      │
  3. Trigger handle_new_user → profiles + user_roles(individual)            │
  4. Migration : favoris/préférences LOCAUX → serveur (profile_id)          │
  5. Toast discret « Ajouté à vos favoris »                                 │
[ANONYMOUS · session invisible]  ◀───────────────────────────────────────────┘
  → le 1er favori est ENREGISTRÉ, SANS inscription, SANS écran, SANS friction.
```

L'inscription **n'apparaît pas** ici : elle viendra plus tard, comme **conséquence**.

## 2. Déclencheurs d'inscription JIT (par priorité + justification)

On distingue **création anonyme** (silencieuse) et **upgrade compte** (visible, optionnel).

### 2.a Création de la session ANONYME (silencieuse, 0 clic, 0 écran)
| Déclencheur | Pourquoi |
|---|---|
| 1er favori | Acte d'intention le plus fort → mérite persistance |
| 1re préférence apprise (filtre, catégorie récurrente) | Personnalisation qui a de la valeur à conserver |
| 1re localisation accordée | Contexte réutilisable |

### 2.b Prompt d'UPGRADE vers compte permanent (visible, dismissable), par priorité
| # | Déclencheur | Justification produit |
|---|---|---|
| 1 | **Récompense sur le point d'être débloquée** | Valeur tangible immédiate ; l'identité sécurise l'attribution et évite l'abus |
| 2 | **« Retrouver sur un autre appareil »** (réinstallation, changement de tél.) | Le seul vrai besoin d'un compte permanent : la portabilité |
| 3 | **Seuil de favoris atteint** (ex. 3–5) | Sunk-cost positif : « sécurisez votre collection » |
| 4 | **Ouverture du Profil** | L'utilisateur est déjà en état d'esprit « compte » |
| 5 | **Action commerçant** (revendiquer une Maison) | Nécessite une identité réelle (structurel) |

Règle : **jamais bloquant**, **jamais répété** (un « plus tard » persiste via un *milestone* B),
toujours **contextualisé** (on montre CE qu'on protège : « vos 4 favoris »).

## 3. Transitions d'états (machine à états)

```
GUEST ──(acte à conserver)──▶ ANONYMOUS ──(linkIdentity Google/Apple/email)──▶ AUTHENTICATED
  │                              │  ▲                                              │
  │ (offline / Supabase absent)  │  └───(échec/annulation upgrade → on RESTE anonyme, rien perdu)
  └─ reste local, file d'attente │
     de migration                └──(link vers identité DÉJÀ existante) → CONFLIT → §5 (merge)
```
- **GUEST** : aucune session ; état local ; éphémère ; repli si offline / non configuré.
- **ANONYMOUS** : `auth.users.is_anonymous = true` ; profil créé ; favoris/préférences serveur ; rôle `individual`.
- **AUTHENTICATED** : identité liée ; `is_anonymous = false` ; **même id** → zéro migration.

## 4. Données créées / enrichies / migrées

| Étape | Créé | Enrichi | Migré |
|---|---|---|---|
| GUEST | Device Context (lu), favoris locaux, préférences locales | — | — |
| → ANONYMOUS | `auth.users`(anon), `profiles`, `user_roles`(individual) | `profiles` : locale/région par défaut (Device Context) | favoris locaux → `favorites(profile_id, merchant_id)` ; préférences → serveur |
| → AUTHENTICATED | identité (`auth.identities`) | `profiles.primary_email`, `display_name`, `avatar_url` (du provider) ; `is_anonymous=false` | **rien** (même id) — sauf cas CONFLIT (§5) |

> Dépendances de données à créer (cf. §7) : table `favorites` serveur, persistance serveur des
> préférences, fonction de **migration local→serveur**.

## 5. États d'erreur & scénarios de reprise

| Scénario | Comportement | Reprise |
|---|---|---|
| `signInAnonymously` échoue (offline / non configuré) | Favori affiché **en local** (optimiste), pas de blocage | File d'attente → migration au retour réseau |
| Perte réseau pendant un favori | Optimiste local | Sync à la reconnexion (réconciliation) |
| Google/Apple **annulé/refusé** | Retour à l'écran précédent, on **reste anonyme** | Aucun nag ; on reproposera au prochain déclencheur |
| **Conflit** de link (identité déjà utilisée par un autre compte) | On détecte, on propose « Se connecter à ce compte » | Puis **fusion** des données anonymes → compte existant (Edge Function, cf. Identity Engine) ; si refus → données anonymes orphelines (TTL) |
| Provider différent (Google puis Apple) | `linkIdentity` ajoute une 2e identité au **même** user | Si la 2e identité existe ailleurs → conflit ci-dessus |
| Lien magique : app fermée avant clic | Session en attente ; deep-link au retour | Lien expiré → renvoyer |
| Réinstallation (session locale perdue) | Nouveau GUEST ; ancien anonyme orphelin | D'où l'importance d'**inciter à l'upgrade tôt** ; TTL nettoie |

## 6. Critères d'acceptation UX

| Critère | Cible |
|---|---|
| Temps pour **commencer à utiliser** YOOTOO | **0 s** (aucun mur) |
| Clics pour **enregistrer le 1er favori** | **1 tap** (session anonyme invisible) |
| Champs à l'**inscription** | **0** (social) · **1** (email, lien magique) |
| Clics pour un **compte permanent** | **2** (ouvrir la sheet + tap provider) — social |
| Temps pour **obtenir un compte** | **< 6 s** (social) · **< 20 s** (email + clic du lien) |
| **Perte de données** à l'upgrade | **0 %** (même `auth.users.id`) |
| Écran d'inscription dédié avant découverte | **aucun** |

### One Tap — audit clic/champ
| Élément | Peut-on le supprimer ? | Décision |
|---|---|---|
| Écran de bienvenue | Oui | **Supprimé** (Invisible First) |
| Choix « avec/sans compte » à l'entrée | Oui | **Supprimé** (on entre direct) |
| Prénom / Nom à l'inscription | Oui (provider/autofill) | **Supprimés** |
| Téléphone | Oui (aucun usage immédiat) | **Supprimé** |
| Mot de passe | Oui (lien magique) | **Supprimé** |
| Écran « profil à compléter » | Oui | **Supprimé** (enrichi du provider) |

## 7. Risques ouverts (techniques / produit)

1. **Persistance serveur des favoris & préférences** : le store favoris est en mémoire ; il faut
   une table `favorites(profile_id, merchant_id)` + migration local→serveur (structurel).
2. **TTL / nettoyage des comptes anonymes** : politique à définir (abus, quota Supabase, junk).
3. **Fusion sur conflit de link** (Apple relay, identité déjà existante) : complexité + intégrité
   (Edge Function transactionnelle — déjà cadrée dans l'Identity Engine).
4. **Auth anonyme Supabase** : limites/anti-abus (CAPTCHA ?), quotas.
5. **Offline-first** : optimisme + file de réconciliation à concevoir.
6. **Fiabilité deep-link** (OAuth natif / lien magique).
7. **Instrumentation JIT** : mieux servie par l'**Event Bus** (keystone non encore construit) —
   non bloquant, mais à garder en tête.
8. **Source des préférences pour le Discovery Engine** : passe de local à serveur — à réconcilier.

## 8. Ce que ce blueprint garantit
Un parcours **sans tunnel** : l'utilisateur **utilise** YOOTOO en 0 s, **enregistre** son 1er favori
en 1 tap sans compte, et n'« s'inscrit » que plus tard, en **2 taps / 0 champ**, **sans rien perdre**.
L'inscription n'est plus une porte : c'est une **conséquence**.
