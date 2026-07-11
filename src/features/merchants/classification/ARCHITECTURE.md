# Moteur Hierarchical Multi-Evidence — Architecture (WS2)

*Un moteur de DÉCISION, pas de classification : sa sortie répond à « avons-nous assez de
preuves pour publier cette décision ? », et chaque réponse est justifiée.*

## 1. Arbre de décision

```
Engagement officiel (ESS/coopérative)  ──────────────→  cooperatives · HIGH
        ↓ (absent)
NAF cartographié, non composite
        ├─ preuve N2 absente ou même famille ────────→  catégorie NAF · HIGH
        └─ preuve N2 d'une AUTRE famille ────────────→  QUARANTAINE (contradiction)
        ↓
NAF COMPOSITE (ex. 47.76Z = fleurs | animaux | jardin)
        ├─ preuve N2 ∈ candidats ────────────────────→  candidat concordant · HIGH
        ├─ preuve N2 hors candidats ─────────────────→  QUARANTAINE (contradiction)
        └─ aucune preuve N2 ─────────────────────────→  QUARANTAINE (NAF insuffisant seul)
        ↓
NAF absent ou non cartographié
        ├─ preuve N2 (Google spécifique, puis texte) →  catégorie N2 · MEDIUM
        └─ aucune preuve exploitable ────────────────→  LOW + QUARANTAINE
```

## 2. Hiérarchie des preuves (Loi 5 — le NAF est une preuve, pas une vérité)

| Niveau | Preuve | Rôle |
|---|---|---|
| 1a | **Engagement officiel** (flag ESS de l'API d'État) | définit `cooperatives` — le cas La Cagette prouve que certaines catégories sont invisibles au NAF |
| 1b | **NAF de l'établissement** (SIRENE) | preuve d'activité la plus forte ; certains codes sont COMPOSITES et ne suffisent jamais seuls |
| 2a | **Catégorie Google spécifique** (registre `RAW_TO_CRYPTOGRAM` existant — source unique, Loi 7) ; les types « bureau » (office, agence…) forment une pseudo-catégorie NON-COMMERCE qui contredit tout NAF commerçant | complète le NAF absent ; départage un NAF composite ; révèle les contradictions |
| 2b | **Texte** (nom/description, radicaux en début de mot — jamais de sous-chaîne, Loi 8) | dernier recours du niveau 2 ; deux indices textuels divergents = aucune preuve |

Une preuve inférieure ne remplace JAMAIS une supérieure ; elle complète en son absence.
Divergence NAF/Google **dans la même famille** (caveau 11.02 vu `liquor_store`) = raffinement,
le NAF mène, la divergence est journalisée. Divergence **inter-familles** = contradiction →
QUARANTAINE, aucun ne gagne.

## 3. Invariants

1. **Aucune fiche ne devient invisible** : `QUARANTAINE` est un statut de classification
   (file de travail), jamais une dépublication ni un retrait de la recherche/carte.
2. **Contradiction → quarantaine**, journalisée avec les deux preuves.
3. **Le silence ne produit jamais un rejet** : sans preuve → LOW + QUARANTAINE (revue).
4. **Toute décision est explicable** : `{category, confidence, source, evidence, explanation}`.
5. **Toute décision est reproductible** : fonction pure, zéro I/O, zéro horloge.
6. Les gisements chiffrés (67 vignerons, 57 fleuristes…) sont des ESTIMATIONS —
   aucun seuil ni chiffre du rapport d'exploration n'est codé dans le moteur.

## 4. Structure de sortie

```json
{
  "category": "vignerons-domaines | … | null",
  "confidence": "HIGH | MEDIUM | LOW",
  "source": "officiel (ESS) | NAF | NAF + concordance | Google | texte | aucune",
  "evidence": ["NAF 01.21Z (viticulture)", "…"],
  "explanation": "phrase complète, en français, reconstruisant la décision",
  "status": "CLASSIFIED | QUARANTAINE"
}
```

## 5. Référentiel métier (tests de domaine permanents)

Animalis · La Cagette · Minit · Domaine de Verchant · Caveau viticole · Bureau
administratif viticole · Bus Montpellier · Cheese Nan · Magasin Latino — attendus,
preuves et confiances définis dans `engine.test.ts` (non-régression officielle).
La pertinence (hors-mission, réseau) reste le domaine du SPT : le moteur classifie,
il ne juge pas la publication.
