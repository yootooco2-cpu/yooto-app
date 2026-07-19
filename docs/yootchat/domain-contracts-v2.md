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
- Une affirmation dont le statut ou la preuve vaut `FORBIDDEN` est une donnée de quarantaine : elle est toujours refusée dans une recommandation et une réponse finale.
- Les distances sont reprises à l'identique du candidat préparé par le serveur.
- Les rangs sont contigus, uniques et déterministes (`1..n`).
- Une action d'interface cible uniquement un candidat recommandé et validé.
- La sortie utilisateur référence un modèle déterministe. Le champ `message` n'est jamais une preuve et ne transporte aucun attribut commerçant libre.
- Une demande contient au maximum 800 caractères : 800 est accepté, 801 est refusé.
- Lorsqu'il est fourni, `limitationCount` est un entier strictement positif égal exactement au nombre de limitations structurées ; il est absent lorsque ce tableau est vide.

## Référentiel d'évaluation

Le jeu historique du GATE 0 est classé `LEGACY_GOLDEN_SET_UNRECOVERABLE`.
`YOOTCHAT_GOLDEN_TEST_SET_V2` est un nouveau référentiel officiel, versionné dans
`golden-test-set-v2.json`. Il ne constitue pas une copie de l'ancien jeu. Ses
30 scénarios `V2-S01` à `V2-S30` sont reliés chacun à un comportement de test
exécutable ; l'intégrité du jeu refuse scénario absent, identifiant dupliqué ou
invariant sans exécuteur.

## Frontière du Lot 2

Le module prépare les futurs producteurs et consommateurs, mais ne les connecte
pas. Le Lot 3 devra construire les candidats, distances, messages et classements
de manière déterministe avant de pouvoir appeler ces validateurs.
