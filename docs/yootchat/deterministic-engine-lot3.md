# YootChat - moteur deterministe Lot 3

Cette reconstruction repart du commit durable `a9dce3524eb7e45a7118189c985acf68ecdbe5da`.
Elle ne reprend pas l'ancien commit perdu `f6d509b` et ne tente pas de conserver
son empreinte SHA-256.

## Frontiere

- Aucun appel OpenAI.
- Aucune requete Supabase.
- Aucun acces reseau.
- Aucune action engageante: paiement, reservation, appel, message ou publication.
- Le moteur produit une reponse finale uniquement apres validation des contrats V2.

## Pipeline

1. Validation de la demande utilisateur.
2. Inference deterministe du sujet.
3. Validation stricte des candidats.
4. Quarantaine des candidats invalides et des identifiants dupliques.
5. Application des filtres explicites.
6. Classement stable.
7. Construction de preuves depuis les champs structures.
8. Validation de la reponse finale.
9. Fallback sur si la certification echoue.

## Classement

1. Distance connue avant distance inconnue.
2. Distance geographique croissante.
3. Note connue avant note inconnue.
4. Note decroissante.
5. Identifiant commercant croissant.

## Garanties

- Maximum trois recommandations.
- Distance conservee sans arrondi.
- Les services, equipements et engagements officiels viennent uniquement des
  listes structurees du candidat.
- Les engagements officiels utilisent une preuve `OFFICIAL_SOURCE`.
- Une accessibilite inconnue reste une limitation et ne satisfait jamais une
  exigence PMR stricte.
- Les actions d'interface ciblent uniquement des commercants recommandes.
- Les messages restent des templates deterministes et ne deviennent jamais des
  preuves.
