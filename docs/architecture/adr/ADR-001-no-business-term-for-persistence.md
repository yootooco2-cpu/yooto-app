# ADR-001 — Pas de mot métier unique pour la persistance ; deux langages séparés

- **Statut** : proposé (à figer)
- **Contexte** : recherche d'un mot fondateur (Commitment → Memory → Belonging). Tous échouent au
  test « aucune explication nécessaire ». Question posée : a-t-on *réellement* besoin d'un mot métier
  unique, ou d'un moteur interne abstrait sans terme imposé à l'organisation ?

## Décision

**On abandonne la recherche d'un mot métier unique.** On sépare deux langages :

1. **Langage MÉTIER (produit)** — des noms **concrets**, déjà compris de tous, **zéro explication** :
   **Favoris · Préférences · Collections · Historique · Récompenses**. C'est *ça*, la langue ubiquitaire.
2. **Langage ARCHITECTURE (dev-only)** — un **moteur de persistance générique**, descriptif, qui vit
   **uniquement dans le code / les ADR / les schémas**, jamais imposé aux PM/UX/investisseurs.

L'abstraction que nous voulions (« une feature déclare, l'identité réagit ») **survit** — mais comme
un **contrat technique**, pas comme un mot métier.

## Pourquoi (raisonnement honnête)

### Le piège identifié
Chercher un mot « original » viole le seul critère qui compte : **le bon mot ne nécessite aucune
explication**. En DDD, la langue ubiquitaire **émerge du domaine** ; on ne l'**invente** pas pour
l'imposer. Un terme qui exige un glossaire est un *code smell*.

### Un mot métier unique ne se justifie QUE si les 3 conditions sont réunies
1. **Visible par l'utilisateur** (il le voit, le dit — ex. Pinterest « Pin », Slack « Huddle »).
2. **Unifie des expériences réellement identiques** sous un seul nom.
3. **Auto-évident** (aucune définition).

Notre concept **échoue les trois** : l'utilisateur ne voit jamais « la primitive de persistance » —
il voit **Favoris / Collections**. Et aucun mot candidat n'était auto-évident. → **Pas de mot métier.**

### Ce qu'on garde de l'exploration (la vraie valeur)
- L'**inversion de dépendance** : les features **ne connaissent pas** l'identité ; elles **persistent**,
  le moteur **matérialise** l'identité si besoin. → conservée, mais **technique**.
- La distinction en **3 plans** devient une **taxonomie d'ingénierie** (pas des mots métier), chacune
  ayant déjà un foyer dans le dépôt :
  | Plan (interne) | Nature | Foyer existant |
  |---|---|---|
  | Données utilisateur persistées | possédées, durables | `src/lib/data` (Repository/DataSource) |
  | Signaux | observation / analytics | Event Bus (keystone à venir) |
  | Jalons | cycle de vie | `features/system` (Launch/Milestones) |

## Le contrat technique (dev-only, sans code ici)

On **réutilise la couture existante** `EntityDataSource<T,Q>` / `EntityRepository` /
`createEntityRepository` (`src/lib/data`) et on l'enrichit d'une capacité **« persistance
identity-aware, local-first, synchronisée »**. Chaque feature métier (Favoris, Collections…) définit
son **entité** et **persiste via ce store** ; elle ne sait rien de l'identité.

**Invariant d'identité (technique, invisible du métier) :**
> *La première donnée utilisateur possédée persistée à travers le store matérialise une identité
> anonyme (Supabase), en local-first, prête à l'upgrade — même `auth.users.id`, zéro perte.*

- **Nom du moteur** : descriptif et ennuyeux, dev-only. Recommandé : **User Data Store** (ou
  « couche de persistance identity-aware »). **Surtout pas** un nom poétique (on ne recrée pas un
  « Belonging » interne).
- Aucun terme imposé à l'organisation : les PM continuent de dire *Favoris/Collections*.

## Conséquences

**Positives**
- **Zéro taxe cognitive** : personne n'apprend un nouveau mot ; le métier reste limpide.
- **Zéro ambiguïté** : plus de mot abstrait à mal interpréter.
- **On ne réinvente rien** : on étend la couture `lib/data` déjà en place.
- L'invariant d'identité et l'inversion de dépendance sont **préservés** là où ils comptent (le code).

**À accepter**
- Pas de « concept phare » à mettre en avant en interne/pitch. C'est un **choix**, pas un manque :
  le phare de YOOTOO, c'est l'**expérience** (invité→anonyme→membre, zéro perte), pas un mot.

## Alternatives écartées
- **Imposer Commitment / Memory / Belonging** : ambiguïté + taxe cognitive, pour un concept que le
  métier ne voit jamais. Rejeté.
- **Codename interne poétique** : rejoue le même piège à l'échelle des devs. Rejeté au profit d'un
  nom **descriptif**.

## Impact sur le Blueprint
- Le déclencheur de la session anonyme n'est plus un mot métier : c'est une **propriété du store**
  (« la 1re persistance de donnée utilisateur possédée matérialise l'identité »).
- Le métier du Blueprint reste **concret** : Favoris, Préférences, Collections, Historique.
- Le reste (JIT upgrade, transitions, erreurs, critères UX) inchangé.

> Conclusion : **on garde une excellente architecture avec un vocabulaire métier simple.** On fige
> la fondation sur *cette* base, sans nouveau terme — c'est plus robuste à 10 ans qu'un mot élégant
> mais ambigu.
