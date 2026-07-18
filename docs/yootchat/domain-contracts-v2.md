# YootChat — contrats de domaine v2

Ce module décrit uniquement le langage interne pur de YootChat. Il ne réalise
aucun accès réseau, aucune lecture Supabase, aucun appel OpenAI et aucune action
d'écriture.

## Invariants

- Une action est une union discriminée : son nom détermine exactement ses paramètres.
- Les validateurs runtime refusent clés supplémentaires, valeurs manquantes, doublons et limites invalides.
- Seuls les candidats `active` peuvent être validés.
- Une affirmation `VERIFIED` doit être égale au fait structuré du candidat.
- Services, équipements et engagements officiels sont des listes structurées ; le texte libre ne peut jamais les prouver.
- Une donnée inconnue reste `UNKNOWN` avec une valeur `null`.
- Une preuve `MEDIUM` ne peut jamais soutenir une affirmation `VERIFIED`.
- Les distances sont reprises à l'identique du candidat préparé par le serveur.
- Les rangs sont contigus, uniques et déterministes (`1..n`).
- Une action d'interface cible uniquement un candidat recommandé et validé.
- La sortie utilisateur référence un modèle déterministe. Le champ `message` n'est jamais une preuve et ne transporte aucun attribut commerçant libre.

## Frontière du Lot 2

Le module prépare les futurs producteurs et consommateurs, mais ne les connecte
pas. Le Lot 3 devra construire les candidats, distances, messages et classements
de manière déterministe avant de pouvoir appeler ces validateurs.
