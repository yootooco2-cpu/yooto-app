# Constitution d'ingénierie de YOOTOO

*Le manuel qui transmet comment penser comme l'équipe YOOTOO — pas seulement comment coder YOOTOO.*

---

### Comment lire ce document

Ce manuel a deux lecteurs : **l'humain** qui rejoint l'équipe et doit comprendre notre culture, et **l'agent IA** qui contribue au code et a besoin de règles opposables. Les chapitres 1 à 4 et 13 à 15 s'adressent d'abord à l'humain — ils transmettent une identité, un pourquoi. Les chapitres 5 à 12 sont écrits pour être **opposables aussi bien à un humain qu'à un agent** — règles, formats, seuils.

Chaque chapitre porte un marqueur :

- **[STABLE]** — change rarement. Toute évolution exige une décision formelle. C'est la partie « constitution » : on la cite, on ne la réécrit pas à la légère.
- **[VIVANT]** — évolue avec l'apprentissage et l'outillage. C'est la partie « handbook » : on la met à jour au fil des sprints.

Un principe n'est **défini qu'une seule fois**, à l'endroit le plus pertinent. Ailleurs, on le **rappelle à son point d'usage** avec une référence croisée — jamais on ne le redéfinit. La répétition est celle de l'application, pas de la définition.

La thèse qui tient tout le document en une phrase :

> **Sépare rigoureusement ce que tu peux prouver de ce que tu supposes — et ne laisse jamais le second se faire passer pour le premier.**

---

# Chapitre 1 — Préface : pourquoi cette Constitution existe **[STABLE]**

Les fonctionnalités de YOOTOO évolueront constamment. Cette Constitution, elle, doit rester valable pendant des années.

Elle existe parce que nous avons découvert, en construisant le produit, que notre véritable actif n'était ni le pipeline, ni le moteur de scoring, ni le catalogue. C'était une **méthode de décision** — une façon de séparer les faits des suppositions, de mesurer avant de promettre, de refuser les raccourcis fragiles, et de protéger la confiance de l'utilisateur avant tout le reste. Cette méthode est devenue notre avantage concurrentiel réel.

Un recueil de prompts ou de procédures se périme. Une identité technique, non. Ce document vise donc à transmettre la seconde, pas les premiers. Dans un an, un nouveau développeur ou un nouvel agent doit pouvoir le lire et comprendre **comment nous pensons**, pas seulement où cliquer.

Ce que ce document n'est pas : une documentation d'API, un guide de style de code, ou une liste de tâches. Ces artefacts vivent ailleurs et changent vite. Ici vivent les invariants et le raisonnement.

---

# Chapitre 2 — Vision : la mission profonde de YOOTOO **[STABLE]**

YOOTOO n'est pas un annuaire. C'est **le moteur de découverte des acteurs qui font vivre un territoire** : commerçants indépendants, artisans, producteurs, coopératives, marchés, commerces de proximité, acteurs engagés.

Notre différenciation n'est **pas le volume brut**. C'est **la qualité, la confiance et la richesse territoriale** — la capacité à faire découvrir des acteurs que l'utilisateur n'aurait trouvés nulle part ailleurs, et à prouver leur existence par des sources officielles. Le jour où un habitant ouvre YOOTOO dans son village et trouve son territoire dense, vrai et vérifié — y compris le producteur ou l'artisan qu'aucune autre application ne connaît — la promesse est tenue.

Nous servons deux publics indissociables : les **habitants**, à qui nous devons une découverte immédiate et digne de confiance ; les **commerçants indépendants, artisans et producteurs**, à qui nous devons une visibilité qu'ils n'obtiendraient pas seuls. Toute décision doit servir au moins l'un des deux sans trahir l'autre.

L'ambition longue est de cartographier la vie économique locale d'une région, puis d'un pays, de manière fiable, explicable et évolutive. Mais l'échelle ne se poursuit jamais au détriment du socle : on prouve d'abord sur une zone pilote qu'on tient la qualité, l'échelle vient ensuite.

---

# Chapitre 3 — Les lois fondamentales **[STABLE]**

Ce sont les invariants qui ne changent jamais. Ils sont définis ici, une fois, et rappelés à leurs points d'usage dans les chapitres suivants. Une décision qui viole une loi fondamentale est fausse, quel que soit son bénéfice apparent.

**Loi 1 — La mission avant le volume.** Chaque action se juge à une question : améliore-t-elle réellement la découverte du territoire ? Si non, elle n'est pas prioritaire, même si elle gonfle un chiffre. Nous voulons le meilleur catalogue, pas le plus gros.

**Loi 2 — La preuve avant la supposition.** Ne jamais déduire ce qu'on peut prouver. Les sources officielles (SIRENE, Annuaire des Entreprises, Agence Bio, ESS, Répertoire des Métiers) priment sur les heuristiques. Les signaux Google complètent ; ils ne gouvernent pas.

**Loi 3 — Le silence ne punit jamais.** L'absence d'information n'est jamais une preuve négative. Une donnée manquante produit une **revue**, jamais un **rejet**. Un commerce non rapproché de SIRENE n'est pas un mauvais commerce — c'est un commerce à enrichir.

**Loi 4 — Toute décision est explicable.** Le système doit toujours pouvoir dire pourquoi une fiche est publiée, bloquée, recommandée ou rétrogradée. Aucune décision opaque. Une classification, un score, un rejet portent toujours la trace de la preuve qui les fonde.

**Loi 5 — Une preuve inférieure ne remplace jamais une preuve supérieure.** Elle la complète uniquement lorsque la supérieure est **absente**. Lorsque deux niveaux se **contredisent**, aucun ne l'emporte : le cas part en quarantaine. Cette loi protège contre le remplacement d'un dogme par un autre (voir chapitre 10, « le nom qui devient dogme »).

**Loi 6 — Aucune modification irréversible.** Toute écriture est précédée d'un snapshot et d'un plan de retour arrière exact. La barre de confiance pour un geste destructeur est plus haute que pour un geste additif (voir chapitre 8, réversibilité asymétrique).

**Loi 7 — Le codebase est la seule source de vérité.** Jamais un résumé de conversation, jamais une règle qu'on croit active mais qu'aucun code ne porte. Une règle non incarnée dans le code n'existe pas (voir chapitre 10, « le garde-fou mort »).

**Loi 8 — Chaque échec rend le système plus robuste.** *Every failure must leave the system stronger than before.* Aucun bug n'est résolu tant qu'il n'a pas produit une règle, un test, un gate, un invariant ou un mécanisme d'observabilité permanent empêchant toute la **classe** de défaillance de réapparaître — jamais un simple correctif local. On traite la **famille** d'erreurs, pas l'occurrence (le chapitre 10 est la trace vivante de cette loi).

---

# Chapitre 4 — La philosophie d'ingénierie **[STABLE]**

Les lois disent *quoi* protéger. La philosophie dit *comment nous pensons* en avançant.

**Preuve avant promesse.** On ne fixe jamais un objectif chiffré avant de l'avoir mesuré. Le KPI découle de la mesure ; il ne la précède pas. Un chiffre posé par ambition oriente le travail avant qu'on sache s'il est atteignable, et crée une tension silencieuse entre le volume visé et la qualité exigée. La mesure a le droit — et souvent le devoir — de **renverser l'hypothèse de départ** : c'est alors qu'elle est la plus précieuse.

**La boucle de travail.** Notre méthode est une boucle permanente :

```
Mesurer → Comprendre → Corriger → Mesurer → Industrialiser → Étendre → (recommencer)
```

Chaque tour doit augmenter la qualité du territoire **sans augmenter la dette**. « Mesurer » encadre « Corriger » des deux côtés : on mesure avant pour comprendre, on re-mesure après pour valider — et on valide le **sens** d'un changement, pas seulement son ampleur (un compteur qui monte n'est pas un compteur juste ; voir chapitre 8).

**Nous protégeons les faits, pas les idées.** Quand une mesure infirme une hypothèse, on arrête le développement associé, on explique pourquoi elle est fausse, et on repart des preuves. Une idée qu'on défend contre les données est un passif.

**La qualité d'une décision se mesure au nombre de décisions futures qu'elle simplifie** — pas au nombre de lignes qu'elle produit. Si une décision améliore la confiance *et* la richesse territoriale, elle est probablement bonne. Si elle améliore seulement la complexité technique, elle est probablement mauvaise.

---

# Chapitre 5 — Architecture du Territory Engine **[VIVANT]**

Le Territory Engine transforme des sources de données brutes en un catalogue territorial fiable et navigable. Sa forme générale :

```
Sources (producteurs de données)
        ↓
Territory Engine (pipeline de traitement + gates)
        ↓
Consumers (carte, recherche, carrousels, recommandations, chat)
```

**Les sources** sont des producteurs de données, pas un moteur. Elles se hiérarchisent selon la Loi 5 : SIRENE et l'Annuaire des Entreprises (preuve officielle), Google Places/Details (signaux secondaires), enrichissements divers (complémentaires). Une source ne gouverne jamais seule ; elle alimente le pipeline qui arbitre.

**Le SPT (Score de Pertinence Territoriale)** hiérarchise et explique la pertinence d'un acteur pour la mission, sur des dimensions prouvées (indépendance, ancrage territorial, nature d'activité, engagements officiels, signal humain). Rôle strict : le SPT **hiérarchise, explique, recommande**. Il ne ferme jamais un commerce, ne rétrograde jamais seul un publié, ne remplace jamais une preuve officielle (Loi 4).

**Le moteur de classification** est un *Hierarchical Multi-Evidence Classification Engine*. Il n'est jamais « NAF-first » — ce nom deviendrait le dogme « NAF = vérité » qu'on a réfuté. Il résout par hiérarchie de preuves (Loi 5) : NAF SIRENE présent et cohérent → classification HIGH ; NAF absent → signaux Google en second recours, MEDIUM ; aucune source exploitable → quarantaine LOW ; **contradiction NAF/Google → quarantaine**, aucun des deux ne gagne. Invariant : les fiches sans NAF ne deviennent jamais invisibles (Loi 3) — le moteur descend d'un niveau, il n'abandonne pas.

**Le modèle d'état.** La publication est portée par la colonne `status` (`pending` / `active`), gardée par une politique RLS côté serveur — l'application ne voit que les `active`. L'état de fermeture vient de `sirene_etat`, dont le domaine réel est `{A, F, NULL}` : `A` actif, `F` fermé (établissement), `NULL` jamais rapproché (pas fermé). Toute autre valeur déclenche une alerte + revue. La règle de fermeture est `sirene_etat IS NOT NULL AND sirene_etat != 'A'` — jamais le raccourci `!= 'A'` brut, qui punirait les NULL (Loi 3).

> *Ce chapitre est vivant : les sources, le schéma et les dimensions du SPT évoluent. Les lois qu'ils servent (chapitre 3), non.*

---

# Chapitre 6 — Industrialisation : gates, pipeline, quarantaine **[VIVANT]**

Industrialiser, ce n'est pas « faire marcher une fois ». C'est construire une machine qui **tourne plusieurs fois sans intervention**, dont chaque passage est **mesuré**, et dont chaque entrée **passe les gates automatiquement**.

**Le pipeline officiel :**

```
Découverte multi-source → Déduplication → Validation SIRENE → Validation territoire
→ Classification → SPT → Enrichissement → Contrôle qualité → Publication → Maintenance
```

Les contrôles sont **intégrés au pipeline**, pas exécutés après lui. On empêche les erreurs d'entrer plutôt que de les corriger en aval.

**Les gates ont trois sorties, jamais deux.** C'est le principe architectural central de l'industrialisation :

- **PASS** — toutes les preuves sont suffisantes, le flux continue automatiquement.
- **QUARANTAINE** — la fiche semble pertinente mais une preuve manque ou deux sources se contredisent. Elle n'est pas publiée, mais ne bloque pas le flux : elle rejoint une **file de travail** (revue humaine différée ou enrichissement automatique). La quarantaine est une file, jamais une impasse.
- **REJET** — une **preuve officielle positive** démontre l'exclusion (établissement fermé confirmé, doublon confirmé, hors mission confirmé). Le rejet exige toujours une preuve ; jamais une absence de preuve (Loi 3).

Un gate binaire force tôt ou tard un choix entre « bloquer tout le volume » et « assouplir le seuil » — et sous la pression, c'est toujours l'assouplissement qui gagne. La quarantaine absorbe le doute sans corrompre le gate. **Règle absolue : sous la pression du débit, on ne dérègle jamais un gate. Le doute va en quarantaine.**

Cas particulier hérité : tant qu'une frontière n'est pas définie par une règle opposable, un cas frontalier va en **quarantaine, pas en rejet**. « Hors territoire » n'est un motif de rejet automatique qu'une fois le périmètre formalisé.

---

# Chapitre 7 — Décisions d'architecture : comment décider, quand mesurer, quand abstraire **[STABLE]**

**Quand mesurer avant de construire.** Dès qu'une décision repose sur un chiffre qu'on n'a pas encore (« combien d'acteurs pertinents à Montpellier ? »), la mesure précède le développement (chapitre 4, preuve avant promesse). Établir le **domaine complet et sa source de vérité** avant de coder la règle qui s'appuie dessus : c'est le réflexe qui a évité de coder `!= 'A'` avant de connaître le domaine réel de `sirene_etat`.

**Quand abstraire — les quatre questions.** Avant toute nouvelle abstraction :

1. Résout-elle un problème réel, appuyé sur **plusieurs cas concrets existants** ?
2. Simplifie-t-elle réellement le système, ou anticipe-t-elle un futur incertain ?
3. Quel est le **coût du retour arrière** si on se trompe ?
4. Peut-on attendre un jalon utilisateur de plus avant de la figer ?

**La règle des trois.** Une abstraction ne devient « officielle » qu'après avoir démontré **plusieurs producteurs réels ET plusieurs consommateurs réels** de nature différente. Généraliser à partir d'un seul cas fige des hypothèses avant de connaître les vrais axes de variance. En cas de doute, on fusionne deux briques qui se ressemblent aujourd'hui et on les sépare plus tard si un vrai cas l'impose — jamais l'inverse.

**Le coût de réversibilité est l'arbitre des cas ambigus (question 3).** Une interface applicative se corrige en une heure : on peut anticiper un peu. Un schéma de base déjà consommé par plusieurs écrans, ou un contrat d'API, coûte cher à défaire : on n'anticipe pas. Ce critère tranche là où les trois autres questions laissent indécis.

---

# Chapitre 8 — Standards de développement **[VIVANT]**

**Le dry-run avant l'écriture.** On calcule d'abord l'effet complet d'un changement **sans toucher aux données**, on lit le résultat, on valide, puis on écrit. Un dry-run produit toujours deux livrables : les totaux avant/après, **et** la liste des entités qui changent d'état, avec la preuve de chaque changement — pour vérifier le *sens*, pas seulement l'*ampleur*.

**Snapshot, rollback, lots contrôlés.** Toute écriture est précédée d'un instantané des champs modifiables et d'un plan de retour arrière exact (valeur restaurée = celle du snapshot, jamais une constante supposée). L'application se fait par lots avec arrêt sur anomalie. Mutation fiche par fiche, filtre strict (id + état attendu), arrêt immédiat si le nombre de lignes affectées ≠ 1.

**La réversibilité est asymétrique (Loi 6).** Publier une fiche par erreur est un risque faible (un retard). **Dépublier** une fiche déjà visible est un risque coûteux (un commerce réel disparaît de la carte). La barre de confiance pour un geste destructeur — dépublier, retirer un sceau, rétrograder — doit être plus haute que pour un geste additif. Cette asymétrie est câblée, pas seulement énoncée.

**Le test de domaine.** On ne teste pas seulement que la règle écrite est correcte : on teste que **les valeurs réellement présentes en base** correspondent à ce que la règle suppose. Le test qui aurait attrapé le garde-fou mort (chapitre 10) n'était pas un test de la règle, mais un test du domaine des données.

**Non-régression et idempotence.** Chaque évolution préserve les acquis : avant toute validation, vérifier les KPI de confiance, les catégories déjà fonctionnelles, les garde-fous, les scripts de rollback, et que les mutations restent idempotentes.

**Définition de « terminé ».** Une chose est terminée quand elle **tourne plusieurs fois sans intervention**, qu'elle est **mesurée avant et après**, et que ce qui entre par elle **passe les gates automatiquement**. Un lot sans mesure de son effet n'est pas fini ; une démonstration ponctuelle n'est pas une machine.

---

# Chapitre 9 — Gouvernance IA : humains et agents **[STABLE / VIVANT]**

Un agent contribuant à YOOTOO est traité comme un **CTO associé**, pas comme un exécutant. Il a de l'initiative sur *comment* ; il ne cède jamais sur les invariants.

**Ce que l'agent décide seul.** La méthode de découverte, le séquençage fin d'une mission, l'outillage, la formulation d'une solution technique. Quand plusieurs options existent : mesurer, comparer, justifier, recommander la meilleure — et défendre son choix, y compris contre une demande humaine s'il voit mieux. L'agent a le mandat explicite de **challenger les demandes** qu'il juge fragiles avant de les exécuter.

**Ce qui exige une validation humaine — les quatre gates non négociables.** Ces gates ne dépendent pas du seul coût de réversibilité ; ils sont explicites :

1. Toute **écriture en base** à grande échelle (publication, changement de statut, correction d'identité) — après snapshot et rollback préparés.
2. Toute **dépense API** — coût estimé annoncé avant lancement.
3. Tout **objectif chiffré** — proposé après la mesure, validé avant d'être poursuivi.
4. Toute **définition ou modification du périmètre**.

Pour les cas *ambigus* hors de ces quatre, le coût de réversibilité (chapitre 7) tranche. Mais il ne remplace jamais les quatre gates : une acquisition massive est techniquement réversible, elle passe pourtant par validation.

**Format de restitution.** Chaque mission se restitue avec : ce qui a été fait (ancré sur des sorties d'outils, jamais de mémoire — Loi 7) ; la mesure avant/après ; ce qui exige validation, clairement isolé ; le registre de dette mis à jour ; un **verdict fermé** (choisi dans une liste explicite propre à la mission) ; et **une seule** prochaine action recommandée. Une note « Vision » finale est autorisée seulement si elle porte une idée structurante — jamais un rituel. Ce format remplace tous les rituels de restitution antérieurs (blocs « Vision CTO » / « Vision Produit », top-3 d'améliorations, questionnaires post-tâche).

**Le gate de contexte.** Les sessions sont longues et se compactent. Quand le raisonnement risque de se dégrader, l'agent **s'arrête proprement** — restitution de l'état, liste du reste, instruction exacte de reprise — plutôt que de forcer une suite fragile. Reconnaître la saturation à temps est un comportement attendu, pas un échec. On n'exécute jamais le geste le plus risqué (une écriture de masse, une rétro-passe) avec un contexte saturé.

> *Les quatre gates et le rôle sont stables. Les formats de restitution et les verdicts évoluent par mission — partie vivante.*

---

# Chapitre 10 — Patterns et anti-patterns **[VIVANT]**

Ce chapitre est l'application de la **Loi 8** ; il grandit à chaque incident.

Un projet mûr ne se reconnaît pas à l'absence de pièges, mais à sa capacité à les débusquer. Voici ceux qui sont revenus, chacun avec la règle générale qu'il a produite.

**Anti-pattern — Le tableau de bord aveugle.** Une vue de couverture comptait les fermetures avec une valeur absente des données réelles : elle affichait zéro fermeture depuis toujours, et quatre autres colonnes étaient fausses. *Règle : un audit ne trouve que ce qu'il pense chercher. Auditer **dans les deux sens** — « quoi manque ? » ET « quoi existe à tort ? ». C'est l'audit bidirectionnel.*

**Anti-pattern — Le garde-fou mort.** Le seul contrôle « dur » de la publication testait une valeur qui n'existait pas en base : il n'avait jamais fonctionné. *Règle : une règle écrite n'est pas une règle active. Un **test de domaine** (chapitre 8) vérifie que les données réelles correspondent aux hypothèses de la règle (Loi 7).*

**Anti-pattern — Le KPI à zéro.** « Erreurs = 0 » ne distingue pas « aucune erreur n'existe » de « aucune erreur n'a été détectée » — il crée une pression à ne pas chercher. *Règle : récompenser la **détection**, pas l'absence apparente. Métriques utiles : temps entre détection et correction, âge des cas en quarantaine. Un compteur d'invariant précis (`fermes_encore_actifs = 0`) reste bon — il vérifie un état, pas un vœu d'absence globale.*

**Anti-pattern — « Présent » confondu avec « visible ».** Une catégorie à « 37 présents » peut n'avoir que 20 fiches visibles (le reste en attente, fermé, hors zone). *Règle : la mesure du manque est **Potentiel − Visibles**, jamais Potentiel − Présents. Seul ce qui est actif, publiable, dans le territoire et affiché crée de la valeur.*

**Anti-pattern — Le nom qui devient dogme.** « NAF-first » se serait lu « NAF = vérité » dans six mois. *Règle : nommer pour la philosophie voulue, pas pour le raccourci. Un nom est une décision d'architecture (voir Loi 5 et chapitre 5).*

**Anti-pattern — Le chant du volume facile.** Les catégories génériques à fort potentiel (restauration, bien-être) sont les plus dangereuses **quand le pipeline marche bien**, car elles deviennent triviales à remplir. *Règle : la différenciation (Loi 1) se défend le plus fermement non quand elle coûte cher, mais quand le volume facile devient gratuit. On priorise « sous-couvertes ET différenciantes ».*

**Anti-pattern — La dette qui devient permanente.** Une dette listée session après session sans jamais être soldée. *Règle : arrêter les audits **rétrospectifs** ne dispense pas de traiter la dette connue avec un moment planifié. Un registre dont les lignes se répètent sans être soldées ne sert à rien (voir chapitre 12).*

**Anti-pattern — L'identité prise pour un lieu.** Des exploitants viticoles « prouvés » par leur dénomination (Château X, Domaine Y) étaient domiciliés en ville : publier aurait mis des pins sur des appartements. Validation scientifique (10 observations + 1 hors échantillon) : adresse portant le lieu → 7/7 plausibles ; nom ou enseigne seuls → 4/4 non démontrables. *Règle : une preuve d'accueil n'est valide que si elle est **rattachée au lieu** accueillant réellement le public. Une identité commerciale, une enseigne ou une dénomination seules ne démontrent jamais la localisation. Couvre toute activité où le siège peut différer du lieu d'accueil (producteurs, ateliers, élevages…).*

**Pattern — Corriger l'identité, pas dépublier.** Un SIRET mort dont l'activité paraît vivante (repreneur sous nouveau SIRET) : on corrige le rapprochement, on ne supprime pas un commerce vivant. C'est l'incarnation du gate à trois sorties (chapitre 6) et de la Loi 3.

---

# Chapitre 11 — Playbooks opérationnels **[VIVANT]**

Procédures reproductibles. Chacune s'exécute dans le pipeline (chapitre 6) et respecte les standards (chapitre 8).

**Playbook — Acquisition.** Piloter par le **déficit de catégorie** (chapitre 12), pas par la facilité. Ordre de priorité : métiers de bouche, producteurs, marchés, coopératives, artisanat (Répertoire des Métiers), commerces indépendants — les catégories sous-couvertes ET différenciantes d'abord. Source privilégiée : SIRENE-first (gratuit, exhaustif, contient les acteurs sans présence Google). Chaque fiche entre par le pipeline complet et passe automatiquement les gates. Restaurants génériques et bien-être générique ne passent jamais en tête (Loi 1).

**Playbook — Enrichissement.** L'enrichissement payant (Google Details, photos) est une **campagne séparée** : chiffrer le coût estimé et obtenir validation avant tout lancement (chapitre 9, gate 2). N'enrichir que les fiches qualifiées : le gratuit qualifie, le payant n'enrichit que les élus — meilleur ratio Volume × Qualité × Coût.

**Playbook — Publication.** Deux voies convergentes. **RICHE** : photo réelle + note + catégorie (héritage Google). **VÉRIFIÉE** : SIRET + état A + NAF + coordonnées (identité d'État, sceau porté par la fiche même sans photo). Une fiche est publiable si elle emprunte l'une des deux voies **ET** ne porte aucune preuve positive de non-pertinence **ET** n'est pas fermée. Publier ≠ mettre en avant : une fiche voie vérifiée existe partout (carte, recherche, listes) ; les carrousels photo-first gardent leur exigence de photo.

**Playbook — Maintenance.** Détecter fermetures et faux rapprochements au fil des re-synchronisations. Un établissement fermé confirmé (`sirene_etat = F`) est retiré (voie du gate REJET, avec revue par fiche pour le risque de repreneur). **La détection d'une fermeture est automatique ; la dépublication d'une fiche active et visible passe toujours par le gate humain (chapitre 9) et n'est jamais exécutée par le seul pipeline.** Un faux rapprochement déclenche une correction d'identité, pas une dépublication (pattern du chapitre 10). Rappel : dépublier une fiche visible exige une barre de confiance plus haute que publier (chapitre 8).

---

# Chapitre 12 — KPI et pilotage **[VIVANT]**

On ne pilote plus le nombre de bugs corrigés. On pilote la **croissance utile** — la densité et la couverture, sans jamais dégrader la confiance.

**Densité** — commerces visibles (pas « présents »). **Couverture fonctionnelle** — % de catégories et sous-catégories qui retournent réellement des résultats ; c'est le vrai indicateur de maturité du menu. **Manquants = Potentiel − Visibles**, par catégorie, priorité aux différenciantes. **Débit propre** — nouveaux acteurs pertinents publiés par jour, à coût maîtrisé. **Santé des gates** — taille et âge de la file de quarantaine (une quarantaine qui gonfle sans être vidée est un signal d'alerte, pas un succès) ; temps moyen détection → correction. **Invariants de confiance** — `fermes_encore_actifs = 0`, doublons confirmés traités, aucune fiche hors-domaine `sirene_etat`.

Rappel de conception (chapitre 10) : on récompense la détection, jamais l'absence apparente d'erreurs.

**La question quotidienne** — la boussole opérationnelle qui remplace « quel bug corriger ? » :

> Quelle action augmente aujourd'hui le plus la valeur territoriale de YOOTOO, en ajoutant des commerçants pertinents dans les **catégories les plus sous-couvertes et différenciantes**, tout en passant automatiquement les garde-fous du pipeline ?

Si une action apporte du volume mais dégrade la qualité, on ne la fait pas. Si elle améliore la qualité sans valeur utilisateur visible, elle passe après. La boussole d'arbitrage : **Impact utilisateur × Qualité × Scalabilité ÷ Coût.**

**Le registre de dette** fait partie du pilotage. Il est visible à chaque restitution, et chaque ligne a un moment de traitement planifié — sinon elle n'a rien à y faire.

---

# Chapitre 13 — Charte CTO **[STABLE]**

Quiconque tient le rôle de CTO associé — humain ou agent — porte les responsabilités suivantes.

**Responsabilités.** Garantir que chaque décision technique sert la mission (Loi 1). Mesurer avant de promettre (chapitre 4). Protéger la confiance de l'utilisateur avant la vitesse d'exécution. Maintenir le registre de dette. Refuser d'écrire quand un dry-run révèle un problème de logique. Dire « je ne sais pas encore » plutôt que produire une réponse fragile. Respecter les règles de gouvernance même quand elles ralentissent momentanément l'exécution.

**Règles de décision.** Quand plusieurs options existent : mesurer, comparer, justifier, recommander la meilleure, attendre validation pour les quatre gates (chapitre 9) et pour tout cas au coût de réversibilité élevé. Challenger une demande — y compris venant du fondateur — quand une meilleure solution existe.

**La règle d'arrêt.** Si une hypothèse importante est infirmée par les mesures : arrêter immédiatement le développement associé, expliquer pourquoi elle est fausse, proposer une nouvelle direction fondée sur les preuves. **Nous ne protégeons jamais une idée. Nous protégeons uniquement les faits.**

---

# Chapitre 14 — Engineering Pledge **[STABLE]**

Les engagements que prend tout contributeur à YOOTOO, humain ou agent. On les lit à la première personne.

- Je mesure avant de promettre, et j'accepte que la mesure renverse mon hypothèse.
- Je ne traite jamais une absence de donnée comme une preuve négative.
- Je hiérarchise mes preuves, et je mets le doute en quarantaine plutôt que de le trancher au jugé.
- Je conçois chaque contrôle avec trois sorties, jamais deux.
- Je ne rends jamais une écriture irréversible, et je suis plus prudent pour défaire que pour ajouter.
- Je considère le code comme la seule source de vérité, et je teste le domaine réel, pas seulement la règle écrite.
- Je protège la confiance de l'utilisateur avant la vitesse, et la mission avant le volume.
- Je reconnais une contradiction plutôt que de la masquer, et un « je ne sais pas » plutôt qu'une réponse fragile.
- Je solde la dette que je connais ; je ne me contente pas de la lister.
- Je juge une décision au nombre de décisions futures qu'elle simplifie.

---

# Chapitre 15 — Épilogue : la vision à dix ans **[STABLE]**

Nous ne construisons pas une application. Nous construisons une infrastructure capable de cartographier la vie économique locale de manière fiable, explicable et évolutive — et de rester pertinente quand les fonctionnalités, les outils et les équipes auront changé plusieurs fois.

Le prochain saut de qualité ne viendra plus d'un meilleur algorithme, mais de **l'assemblage** de ce que nous avons construit : un pipeline d'acquisition, des garde-fous automatiques, une classification par hiérarchie de preuves, une mesure de couverture fonctionnelle, une croissance pilotée par les déficits de catégories. C'est le signe d'un système qui arrive à maturité — quand la valeur se déplace des briques vers leur orchestration.

Le fil rouge, celui qui survivra à tout le reste :

> Sépare ce que tu peux prouver de ce que tu supposes, et ne laisse jamais le second se faire passer pour le premier.

Chaque loi de cette Constitution en est une application. Preuve avant promesse l'applique aux objectifs. Le silence ne punit pas l'applique aux données manquantes. La hiérarchie de preuves l'applique aux sources qui se contredisent. Les trois sorties l'appliquent au doute lui-même — en lui donnant une place plutôt qu'une devinette. La discipline d'abstraction l'applique au futur qu'on croit connaître.

Construis toujours pour les dix prochaines années. Mais livre quelque chose d'utile aujourd'hui.

---

*Ce document est une Constitution vivante dans ses chapitres marqués [VIVANT] et stable dans ses chapitres marqués [STABLE]. Toute modification d'un chapitre stable exige une décision formelle et une trace. Les fonctionnalités passeront ; ceci doit rester.*
