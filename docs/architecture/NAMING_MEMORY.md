# YOOTOO — Choix du mot officiel : le concept d'« état utilisateur à conserver »

> Décision de **langage métier** (ubiquitous language), pas de style. Le mot doit fonctionner en
> réunion produit, dans le code, dans les ADR, les schémas d'archi et un deck investisseur —
> pendant 10 ans. Aucun code.

## 0. Le test décisif
Un nouvel embauché — **PM, UX, Data Scientist, dev mobile, dev backend, ingénieur IA, et un
investisseur** — comprend-il **spontanément** le mot, **sans définition** ? S'il faut l'expliquer,
ce n'est pas du langage métier, c'est du jargon d'architecture.

## 1. Grille par rôle (spontanéité de compréhension)
Légende : ✓✓ évident et fort · ✓ clair · ~ ambigu · ✗ trompeur

| Candidat | PM | UX | Data Sci | Mobile | Backend | IA | Investisseur | Verbe naturel |
|---|---|---|---|---|---|---|---|---|
| **Commitment** | ~ (engagement/rétention ?) | ~ (promesse ?) | ~ | ✓ (git/txn) | ✓ (txn) | ~ | ~ (≈ metric rétention) | commit ✓ |
| **Memory** | ✓✓ | ✓✓ | ✓ | ✓ (≈RAM, levé par contexte) | ✓ | ✓✓ | ✓✓ | remember ✓✓ |
| **User Asset** | ✓✓ | ~ | ✓ | ✓ | ✓ | ~ | ✓✓ | — (faible) |
| **Ownership / Owned** | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | — (faible) |
| **Persistent Action** | ✗ | ✗ | ~ | ✓ | ✓ | ~ | ✗ | — |
| **Valuable User State** | ~ (≈ « aha moment ») | ~ | ~ | ~ | ~ | ~ | ~ | — |

## 2. Pourquoi « Commitment » échoue au test (et je l'avais pourtant proposé)
- **Clair pour les devs, trompeur pour les autres.** « Commit » = écriture durable (git, transaction) →
  les ingénieurs comprennent instantanément. Mais PM/UX/Growth/investisseur entendent **« engagement /
  rétention / promesse »** — un **concept produit DIFFÉRENT** (l'utilisateur qui *s'engage envers le
  produit*). En réunion produit, « commitment » **collisionne** avec la métrique d'engagement.
- **Registre.** « The user made a commitment » évoque un abonnement/une obligation, pas « une donnée
  qu'il veut garder ».
- Conclusion : excellent **métaphore d'ingénierie**, **mauvais mot de langage métier**. Il doit rester
  un détail d'implémentation, pas le mot officiel.

## 3. Pourquoi « Memory » gagne
- **Compris par TOUS, spontanément.** « Ce que YOOTOO **retient** pour vous. » PM/UX/investisseur
  l'emploient sans définition ; un enfant le comprend.
- **Verbe naturel et parfait** : **remember**. « The app remembers this », « create a memory ». Dualité
  nom/verbe (Memory / remember) idéale pour le code ET les réunions.
- **Aligné IA (futur-proof).** « Memory » est **le** terme de l'ère IA (mémoire d'agent, user memory).
  Les features IA que tu prévois parleront nativement le même mot.
- **Narratif investisseur = moat.** « YOOTOO construit une **mémoire vivante** de la vie locale de
  chaque utilisateur, dès la première seconde, portable et lui appartenant. » Rétention + différenciation
  en une phrase.
- **Émotionnel et humain**, jamais froid ni intrusif : une mémoire est **pour** l'utilisateur (à lui),
  pas un « actif » **de** l'entreprise → meilleur cadrage **RGPD/confiance** que « Asset ».
- **Périmètre exact** : on ne « retient » que ce qui mérite de l'être (possédé + durable). On ne
  « retient » pas un tap → exclut naturellement l'éphémère.

### Le seul risque, et sa parade
« Memory » ≈ RAM pour un dev **hors contexte**. Parade : la **définition officielle** tranche —
> *Memory* = **enregistrement durable, possédé par l'utilisateur, qu'il s'attend à retrouver.**
Le contexte produit domine ; aucune équipe ne confond « la mémoire de l'utilisateur » avec la RAM.

## 4. Les dauphins (et pourquoi non)
- **User Asset** : superbe pour l'investisseur, mais **connotation « l'utilisateur/ses données =
  actif de l'entreprise »** (risque image/RGPD) et **pas de verbe**. Bon mot de *pitch*, mauvais mot de
  *produit*.
- **Ownership / Owned Data** : excellent cadrage confiance (l'utilisateur possède ses données), mais
  **froid** (« data »), **pas de verbe**, et ne signale pas la **durabilité**.

## 5. Recommandation
Adopter **« Memory »** comme **mot officiel du langage métier YOOTOO**, avec :

| Élément | Terme officiel |
|---|---|
| Le concept (le nom) | **a Memory** (une mémoire) |
| L'acte (le verbe) | **remember** (« retenir ») |
| Le moteur | **Memory Engine** |
| La règle d'identité | **« First Memory materializes identity »** — la première mémoire matérialise l'identité |
| Le contrat feature | `remember(record)` (« retiens ceci ») |

- **« Commitment »** est **rétrogradé** : bon vocabulaire interne d'ingénierie (« on *commit* la mémoire
  au store ») si utile, **jamais** le mot métier.
- Les trois plans deviennent, en langage métier : **Memory** (ce qu'on retient, → identité) ·
  **Signal** (ce qu'on observe, analytics) · **Milestone** (jalon de cycle de vie). Clairs pour tous.

## 6. Si tu préférais malgré tout « Commitment »
Tu gagnerais l'élégance côté ingénierie, mais tu paierais un **coût de traduction permanent** en
réunion produit/investisseur (désambiguïser vs « engagement ») pendant 10 ans — exactement ce que tu
cherches à éviter. Mon avis d'architecte de plateforme : **Memory**.

## 7. Suite
Sur ta validation de **Memory** : je réécris le Blueprint et la note d'abstraction avec ce mot
(Commitment → Memory), **sans code**, puis on finalise la fondation avant toute implémentation.
