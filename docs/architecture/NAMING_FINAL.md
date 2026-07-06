# YOOTOO — Le mot fondateur (décision finale de langage métier)

> On repart **du concept seul**, en oubliant les mots précédents. Aucun code.
>
> **Concept** : « Une donnée **appartenant** à l'utilisateur, **créée par lui**, **assez importante
> pour mériter d'être conservée indépendamment de son identité**. »

## 0. Deux collisions à éviter absolument (contraintes dures)
1. **Vocabulaire IA** → élimine **Memory** (AI memory / RAG / long-term memory). Non négociable.
2. **Vocabulaire spatial de la carte** → YOOTOO est une app carte : **Anchor / Pin / Marker / Drop**
   collisionnent avec les pins et marqueurs. Élégants ailleurs, **dangereux ici**. Éliminés.
3. **Vocabulaire dev** (Persistent, State, Object, Record) → jargon, pas du langage métier. Éliminés.

## 1. Décomposition du concept (ce que le mot doit porter)
| Facette | Exigence sur le mot |
|---|---|
| **Appartient** à l'utilisateur | ownership évident |
| **Créé par lui** | acte volontaire, pas une observation |
| **Mérite d'être conservé** | durabilité / valeur |
| **Indépendant de l'identité** | **portable** — à lui, avant/au-delà du compte |
| Neutre en sentiment | couvre aussi bien un favori qu'une préférence |

La facette la plus distinctive est la **4ᵉ** : quelque chose qui est **à toi quoi qu'il arrive**,
qui **voyage avec toi** de l'anonyme au membre. Peu de mots la portent.

## 2. Grille des finalistes
Légende : ✓✓ fort · ✓ ok · ~ moyen · ✗ échec

| Candidat | Non-dev | Anti-IA | Anti-carte | Nom | Verbe | Docs | Investisseur | 10 ans |
|---|---|---|---|---|---|---|---|---|
| **Belonging** | ✓✓ | ✓ | ✓ | ✓ (a Belonging) | ~ (verbe assoc. *keep*) | ✓✓ | ✓✓ | ✓✓ |
| Keep | ✓✓ | ✓ | ✓ | ~ (a Keep) | ✓✓ (keep) | ✓ | ✓ | ✓✓ |
| Save | ✓✓ | ✓ | ✓ | ~ (a Save) | ✓✓ (save) | ~ (« Save Engine ») | ✓✓ (précédent Pinterest) | ✓✓ |
| Keepsake | ✓✓ | ✓ | ✓ | ✓ | ~ (keep) | ✓ | ~ | ✓ (mais trop *sentimental* → exclut les préférences) |
| Memory | ✓✓ | ✗ (collision IA) | ✓ | ✓ | ✓ | ✓ | ✓✓ | ✗ |
| Anchor | ✓ | ✓ | ✗ (pins/carte) | ✓ | ✓ | ✓ | ✓ | ✓ |

## 3. Recommandation : **Belonging**

> Le concept (nom) = **a Belonging**. Le geste (verbe) = **keep** (« garder »).
> Le pluriel/collection = **your Belongings**.

### Pourquoi c'est le bon pilier
- **Il porte la facette rare** : un *belonging* est **à toi, indépendamment de qui tu es** — exactement
  « conservé indépendamment de l'identité ». Aucun autre mot ne le dit aussi précisément.
- **Non-dev, universel** : « tes affaires / ce qui t'appartient ». Aucune définition nécessaire.
- **Zéro collision** : ni IA, ni carte, ni dev.
- **Double sens = cadeau pour YOOTOO** : *belonging* = (a) une possession, **et** (b) le **sentiment
  d'appartenance** à un lieu/une communauté locale. Les deux résonnent parfaitement avec une app de
  **découverte locale** → le mot est **natif** de l'univers YOOTOO, pas plaqué.
- **Investisseur** : « Le moat de YOOTOO : chaque utilisateur accumule un ensemble **portable** de
  *Belongings* — les lieux, goûts et moments qui sont **à lui**, du premier tap anonyme au membre à
  vie — **et** un sentiment d'appartenance à son territoire. » Rétention + différenciation en une phrase.
- **RGPD/confiance** : ce sont **ses** affaires (à lui), pas un « asset » de l'entreprise.
- **Neutre** : couvre un favori **comme** une préférence (contrairement à *keepsake*, trop sentimental).
- **10 ans** : mot intemporel, jamais à la mode/dépassé.

### La seule faiblesse, assumée
Pas de verbe transitif propre (« to belong » est intransitif). **Parade** : on couple **nom** et
**verbe d'usage** — pratique standard (Pinterest : nom *Pin*, verbe *save*). Ici : nom **Belonging**,
verbe **keep**. « Keep this place » (UX) crée « a Belonging » (métier). Net et cohérent.

## 4. Vocabulaire officiel proposé
| Élément | Terme |
|---|---|
| Le concept (nom) | **a Belonging** — enregistrement durable, possédé par l'utilisateur, créé par lui |
| Le geste (verbe UX) | **keep** (« Keep this ») |
| La collection | **your Belongings** |
| Le moteur | **Belongings Engine** (ou *Belonging Engine*) |
| La règle d'identité | **« The first Belonging materializes identity »** |
| Le contrat feature | `keep(record)` → crée un *Belonging* |
| Les 3 plans | **Belonging** (à toi, durable → identité) · **Signal** (observation → analytics) · **Milestone** (cycle de vie) |

## 5. Alternatives si tu privilégies le VERBE
- **Keep** (verbe roi, non-dev parfait) — si tu veux que l'**action** domine l'UX plutôt que le nom.
  Faiblesse : nom singulier faible (« a Keep »).
- **Save** — meilleure familiarité investisseur (précédent Pinterest « Saves »), mais « Save Engine »
  évoque la sauvegarde disque/jeu.
Dans les deux cas on perd le double sens « appartenance » et la portabilité que **Belonging** offre.

## 6. Recommandation finale
**Belonging** (nom) + **keep** (verbe). C'est le mot qui devient **naturellement un pilier** du
langage YOOTOO : compris par tous, sans collision IA ni carte, crédible en réunion comme en deck,
et **natif** de la promesse locale de YOOTOO. « Commitment » et « Memory » redeviennent, au mieux,
du vocabulaire interne — jamais le mot officiel.

> Sur ta validation : je réécris le Blueprint + l'abstraction avec **Belonging / keep /
> « First Belonging materializes identity »**, sans code, puis on fige la fondation.
