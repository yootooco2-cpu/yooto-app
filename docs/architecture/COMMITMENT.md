# YOOTOO — L'abstraction « Commitment » (identité pilotée par la donnée, pas par la feature)

> Réflexion d'architecture (aucun code). Objectif : trouver l'**événement métier générique** qui
> justifie une identité persistante, pour que **l'identité ne dépende jamais d'une fonctionnalité**.
> Règle censée tenir 5 ans, même si la moitié des features actuelles disparaissent.

## 0. Le défaut du Blueprint actuel

« La session anonyme est créée au **premier favori** » est une **bonne implémentation, mauvaise
abstraction** : elle fait dépendre l'Identity Engine d'une feature (favoris). C'est une **inversion
de dépendance à l'envers** — le socle connaîtrait ses consommateurs. Dans 5 ans, si « favoris »
change de nom ou disparaît, la règle d'identité casse.

**On inverse** : les features **déclarent** une intention de persistance ; l'identité **réagit**.

## 1. Quel est le VRAI événement ?

Ni un favori, ni une récompense, ni un profil, ni une préférence. C'est :

> **La première écriture d'un état utilisateur *possédé* et *durable*.**

Autrement dit : le premier instant où l'utilisateur produit une donnée **qu'il serait contrarié de
perdre**. On appelle cet acte un **Commitment** (engagement d'état), et le verbe **`commit`**
(comme un commit git : une écriture **intentionnelle** et **durable**).

### Critères d'un Commitment (les 3 conditions)
1. **Possédé** — la donnée appartient à *cet* utilisateur (pas globale, pas au système).
2. **Durable** — l'utilisateur s'attend à la retrouver plus tard (pas éphémère/UI).
3. **Authored/owned** — produite ou acquise *par* lui (favori, préférence explicite, note, récompense gagnée), pas simplement *observée* (télémétrie).

### Ce qui n'est PAS un Commitment
Lectures, navigation, **analytics/télémétrie** (observation, pas possession), état d'UI transitoire,
drapeaux de cycle de vie (« tuto vu »). → Ceux-là vivent ailleurs (voir §2).

## 2. Trois plans distincts (anti-sur-abstraction)

Le piège serait de tout appeler « Commitment ». On sépare **trois plans** nets, chacun avec son
foyer :

| Plan | Question | Déclenche une identité ? | Foyer |
|---|---|---|---|
| **Commitment** | « L'utilisateur possède une donnée durable » | **OUI** (matérialise l'identité) | Identity / Persistence Engine |
| **Signal / Event** | « Quelque chose s'est produit (observation) » | Non (peut rester anonyme/agrégé) | Event Bus (keystone à venir) |
| **Milestone** | « Un jalon de cycle de vie est franchi » (1er lancement, tuto vu) | Non | Fondation B (`features/system`) |

Cette taxonomie évite de matérialiser une identité pour un clic anodin, tout en gardant une **règle
unique** pour ce qui compte.

## 3. La règle officielle YOOTOO

> **First Commit materializes identity.**
> Le **premier Commitment** matérialise une identité (anonyme). L'identité ne dépend **d'aucune**
> feature ; les features **déclarent** seulement `commit(record)`.

Une feature ne dit plus « crée une session » ni « je suis les favoris ». Elle dit : **« cette donnée
doit être persistée »**. L'Identity/Persistence Engine décide alors, automatiquement :
1. **Matérialiser l'identité** si aucune n'existe (anonyme Supabase) ;
2. **Écrire en local d'abord** (optimiste, offline-safe) ;
3. **Synchroniser** au serveur (clé `profile_id`) ;
4. **Préparer l'upgrade** (même `auth.users.id` → zéro perte à la liaison).

## 4. Le contrat (conceptuel, sans code)

Une feature enregistre un **type de Commitment** et émet des enregistrements :
```
Commitment {
  kind:    string      // 'favorite' | 'preference' | 'reward' | 'note' | <futur>
  id:      string      // identité stable de l'enregistrement (idempotence)
  payload: <typé par kind>
  at:      timestamp
}
commit(record)  // « cette donnée doit être persistée »
```
Le **Persistence/Identity Engine** garantit : idempotence, local-first, sync éventuelle,
upgrade-safety, et un **registre** des `kind` (chaque feature déclare *comment* lire/écrire son
type). Ce registre **réutilise la couture existante** `EntityDataSource<T,Q>` / `EntityRepository`
(`src/lib/data`) : chaque `kind` fournit sa source (Supabase) + fallback local — **rien de neuf à
inventer**, on compose.

## 5. Inversion de dépendance (le cœur)

```
AVANT (mauvais) :  IdentityEngine ──dépend──▶ Favoris
APRÈS (bon) :      Favoris ─┐
                   Préférences ─┼─ commit(record) ─▶ Persistence/Identity Engine ─▶ Supabase
                   Récompenses ─┘        (les features NE connaissent PAS l'identité ;
                   <futur X> ─┘           l'engine NE connaît PAS les features)
```
Les favoris deviennent **un consommateur parmi d'autres**. L'Identity Engine n'a **aucune**
référence vers eux. C'est la condition pour tenir 5 ans.

## 6. Test des 5 ans

- « Favoris » disparaît → la règle tient (plus personne n'émet ce `kind`, l'engine est intact).
- Nouvelle feature « carnets partagés » → elle fait `commit({kind:'notebook',…})` → identité +
  persistance + sync + upgrade **gratuits**, sans toucher l'Identity Engine.
- Passage à un autre backend → seuls les `EntityDataSource` par `kind` changent ; la règle et le
  contrat `commit` restent.
→ **La règle est invariante au catalogue de features.** ✓

## 7. Risques & garde-fous
1. **Sur-abstraction** : ne PAS tout « committer ». Les 3 critères (§1) + la taxonomie (§2) tracent la ligne. Un tuto vu = **Milestone** (B), pas un Commitment.
2. **Gouvernance des `kind`** : un **registre** minimal + revue empêche la prolifération incohérente.
3. **Comptes anonymes** : le 1er commit crée un anonyme → toujours la politique **TTL/nettoyage** (inchangée, mais désormais déclenchée par un événement *principiel*, pas par une feature).
4. **Frontière avec l'Event Bus** : Commitment (possession) ≠ Signal (observation). Un même geste peut émettre **les deux** (ex. « ajouter un favori » = un Commitment *et* un Signal analytics), mais via **deux plans** distincts — jamais confondus.
5. **Conflit à l'upgrade** (identité déjà existante) : inchangé — géré par la fusion de l'Identity Engine ; le Commitment garantit juste que la donnée est là pour être fusionnée.

## 8. Recommandation & amendement du Blueprint

**Oui, cette abstraction est supérieure** au déclencheur « premier favori ». Je recommande de
l'adopter comme **règle officielle YOOTOO**.

### Amendement proposé au Blueprint (`docs/onboarding/BLUEPRINT.md`)
- **§0 / §1** — remplacer « la session anonyme est créée au 1er favori » par :
  > « L'identité (anonyme) est matérialisée au **premier Commitment** — la première écriture d'un
  > état utilisateur possédé et durable. Le favori en est le **premier consommateur**, pas la cause. »
- **§2** — « Création anonyme » n'est plus une liste de features mais **un seul déclencheur générique** :
  *le premier `commit(record)`*. La liste (favori/préférence/localisation) devient des **exemples**
  de `kind`, pas des règles.
- **§4** — la migration local→serveur devient une **garantie du Commitment Engine**, pas une tâche
  propre aux favoris.

Le reste du Blueprint (JIT upgrade, transitions, erreurs, critères UX) est **inchangé** — il gagne
seulement en solidité conceptuelle.

> Aucun code. Si tu valides cette abstraction, je réécris le Blueprint en conséquence (toujours
> sans implémentation), puis on découpera l'implémentation autour du **Commitment Engine** — dont
> les favoris ne seront que le premier client.
