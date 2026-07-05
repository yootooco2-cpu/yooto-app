# Les 30 premières secondes de YOOTOO — le film de l'exploration

> **Référence produit.** Toute fonctionnalité future doit respecter cette mise en scène. Si une
> feature casse ce film, c'est la feature qui a tort.

> On ne dessine plus des écrans. On met en scène **une découverte**. Chaque seconde a une intention ;
> chaque mouvement, chaque apparition, chaque **silence** a une raison. Aucun effet gratuit.

**Le contrat des 30 secondes.** À la 30ᵉ seconde, sans avoir *cherché*, l'utilisateur a :
1. identifié **un commerce** précis ; 2. situé **un lieu** (un quartier, un repère) ; 3. ressenti une
**envie de sortir** ; 4. perçu une **qualité** (premium, réel, soigné) ; 5. développé une **confiance**
dans la carte. Et surtout : il a compris que **parcourir la carte est déjà un plaisir** — pas un
moyen, une fin.

---

## Comment lire ce document

Le film a **deux tracés** qui partagent la même mise en scène :
- **Tracé passif** — l'utilisateur ne touche rien. La caméra est presque immobile (elle *ne bouge
  jamais juste parce qu'elle peut*). La découverte vient de l'**apparition éditoriale** et de la
  hiérarchie visuelle, pas du mouvement.
- **Tracé actif** — l'utilisateur regarde, effleure, tape. La caméra **répond** (moods `focus`,
  `browse`, `return`) et **s'efface** toujours devant le geste.

Le storyboard décrit le **chemin le plus probable** (un mélange des deux). Chaque battement liste :
*objectif cognitif · objectif émotionnel · caméra · carte · marqueurs · interface · Discovery* — et
la **question permanente : pourquoi a-t-il envie de continuer ?**

Chaque mouvement caméra est nommé par son **mood** (voir [CAMERA.md](./CAMERA.md)) et sa **raison** :
c'est le Camera Engine qui garantit qu'aucun mouvement n'est gratuit (le Scheduler *sait dire non*).

---

## 0 s — L'ouverture (avant tout mouvement)

La toute première image, **figée**, doit déjà dire « endroit où j'ai envie d'aller ».

- **Cognitif :** « voici *ma* ville, et elle est calme et lisible. » Aucune surcharge, aucun spinner
  anxiogène.
- **Émotionnel :** accueil, chaleur, sérénité. Le **papier chaud** (style YOOTOO) pose le ton.
- **Caméra :** *aucune*. Restauration de la dernière vue (`restore` → `jump`) ou cadrage ville déjà
  en place. Pas de vol d'intro spectaculaire — on n'impressionne pas, on **accueille**.
- **Carte :** fond désaturé qui **recule** ; l'eau (le Lez) et un grand axe orientent déjà l'œil.
- **Marqueurs :** quelques pastilles seulement, dont **1 exceptionnel** (aura or) posé comme point
  focal naturel. Pas de « sapin de Noël ».
- **Interface :** minimale. Barre de recherche discrète, un FAB « autour de moi ». Rien ne clignote.
- **Discovery :** a **déjà** classé la ville (ranking éditorial + contexte heure/saison). Ce qui est
  visible n'est pas aléatoire : c'est le meilleur, d'abord.
- **Pourquoi continuer ?** Parce que la première image est **belle et calme** — et qu'un point doré
  attire doucement le regard, sans le forcer.

---

## 2 s — La ville respire (apparition éditoriale)

- **Cognitif :** « cette carte est *curatée* — on me montre les bonnes adresses. »
- **Émotionnel :** une ville qui s'éveille ; sensation de qualité immédiate.
- **Caméra :** `discover` **très léger** (ease ~800 ms) si un cadrage s'impose, sinon **rien**. Jamais
  de zoom brutal.
- **Carte :** inchangée ; c'est la **couche marqueurs** qui s'anime.
- **Marqueurs :** [Phase 5] les meilleures adresses **apparaissent dans l'ordre éditorial** — marché,
  meilleur boulanger, meilleur café — en **fondu** (jamais tous d'un coup). « La ville révèle ses
  meilleures adresses. »
- **Interface :** immobile (elle ne vole pas la vedette).
- **Discovery :** pilote l'ordre et la cadence de révélation (rang éditorial déjà porté par chaque
  marqueur).
- **Pourquoi continuer ?** Parce que **quelque chose se passe**, doucement, et que ce qui apparaît a
  l'air *bon*. La curiosité est piquée sans agression.

---

## 5 s — Le regard se pose (sans qu'on le lui demande)

- **Cognitif :** « il y a un lieu qui m'attire, là. » Pré-attentif : la couleur = catégorie.
- **Émotionnel :** désir naissant ; « tiens, un café… »
- **Caméra :** `rest`. Elle se tait — l'utilisateur observe.
- **Carte :** stable, respirante.
- **Marqueurs :** la hiérarchie fait son travail : l'**exceptionnel or** et 1–2 **recommandés**
  (double anneau, plus d'air) émergent ; les standards restent discrets. L'œil tombe naturellement
  sur un marqueur — **sans texte, sans flèche**.
- **Interface :** rien. Le silence est une décision.
- **Discovery :** contextualise (matin → café/boulangerie remontent ; soir → tables ouvertes).
- **Pourquoi continuer ?** Parce que son œil a **choisi tout seul** une adresse. Il veut savoir ce
  que c'est.

---

## 8 s — Le premier contact (identification)

Le battement pivot : le geste. (Tracé actif — l'utilisateur tape le marqueur qui l'a attiré.)

- **Cognitif :** « ce lieu existe vraiment, et il a l'air excellent. »
- **Émotionnel :** intimité, envie. On passe de la ville **au lieu**.
- **Caméra :** `focus` (ease decel ~600 ms) → niveau *commerce sélectionné* (zoom ~17.5, pitch ~45°).
  Immersion douce, jamais un vol. **Un seul pop** sur le marqueur au clic.
- **Carte :** se penche légèrement ; la rue prend du relief (on est « devant » le lieu).
- **Marqueurs :** le sélectionné passe en **anneau vert YOOTOO** épais, domine ; les autres s'estompent.
- **Interface :** la **bottom sheet monte** ; en même temps la caméra fait un `adjust` (**nudge** :
  padding seul) pour garder le commerce **visible au-dessus** de la sheet. Tout est synchronisé.
- **Discovery :** fournit la fiche déjà priorisée (photo réelle, note, statut producteur).
- **Pourquoi continuer ?** Parce que **la photo est belle** et que la fiche répond avant même la
  question. On veut lire.

---

## 12 s — La sensation de qualité

- **Cognitif :** « c'est du sérieux : vraie photo, vraie note, une raison d'y aller. »
- **Émotionnel :** confiance, gourmandise, « premium ».
- **Caméra :** `rest`. On laisse lire (aucun mouvement parasite).
- **Carte :** en fond, apaisée, le commerce reste le héros au-dessus de la sheet.
- **Marqueurs :** un **second exceptionnel** affleure au bord de l'écran → « il y en a d'autres ».
- **Interface :** la fiche montre l'essentiel, hiérarchisé — **cover photo (héros)**, nom, couleur de
  catégorie, **la raison éditoriale** (« meilleur café du quartier »), *ouvert maintenant*, distance.
  Zéro marketing, que du concret.
- **Discovery :** la « raison » vient du score éditorial (mission, qualité visuelle, note) — la carte
  **explique** son choix, elle ne l'impose pas.
- **Pourquoi continuer ?** Parce que la qualité est **prouvée**, pas promise. La confiance monte d'un
  cran.

---

## 18 s — L'envie de sortir (la proximité devient concrète)

- **Cognitif :** « c'est **à côté**, je pourrais y aller *maintenant*. »
- **Émotionnel :** l'envie devient **intention**. La ville est accessible, à taille humaine.
- **Caméra :** `rest`, ou `browse` (ease decel court, **même échelle**) si l'utilisateur passe au
  commerce suivant — feuilletage fluide, **jamais** un re-vol à chaque fiche.
- **Carte :** révèle un **petit groupe marchable** autour (une rue, une place) — densité lisible.
- **Marqueurs :** les voisins de qualité forment une **constellation** : « une balade, pas un point ».
- **Interface :** « à 6 min à pied », contexte temporel (terrasse ce soir / marché ce matin).
- **Discovery :** signaux temps/saison (`timeSignals`, `seasonOf`) — la bonne envie au bon moment.
- **Pourquoi continuer ?** Parce qu'il **se projette dehors**. Ce n'est plus une carte, c'est un plan
  de soirée possible.

---

## 25 s — Le plaisir de parcourir

- **Cognitif :** « je peux me balader sur la carte et ça reste clair, agréable, riche. »
- **Émotionnel :** **plaisir d'exploration** pur — le cœur de YOOTOO.
- **Caméra :** suit le geste et **s'efface** (l'utilisateur gagne toujours). Aucun snap-back, aucun
  tremblement (dead-zone). Quand il s'arrête, elle se tait.
- **Carte :** de nouvelles zones se révèlent **éditorialement** au fil du pan — toujours le meilleur
  d'abord, jamais un mur uniforme.
- **Marqueurs :** apparitions/disparitions en fondu, pool borné → **fluide**, jamais saturé.
- **Interface :** discrète ; la sheet se réduit si l'utilisateur explore la carte (synchronisation).
- **Discovery :** re-classe en continu selon la zone visible — la carte reste **curatée partout**.
- **Pourquoi continuer ?** Parce que **se promener est déjà récompensant** : chaque coup d'œil offre
  une bonne adresse. C'est là que YOOTOO devient une habitude.

---

## 30 s — La confiance (la boucle se referme)

- **Cognitif :** « cette carte me comprend et ne me trahit pas. Je reviendrai. »
- **Émotionnel :** confiance tranquille, sentiment d'appartenance à sa ville.
- **Caméra :** si l'utilisateur ferme la fiche → `return` (ease standard, **léger** dézoom au niveau
  rue) : il **retrouve son contexte**, sans se perdre, sans être ramené de force ailleurs.
- **Carte :** revient à un cadrage d'exploration, apaisée, « la sienne » désormais.
- **Marqueurs :** la constellation reste, invitante — la promesse qu'il y a **toujours** à découvrir.
- **Interface :** rendue au calme initial, mais l'utilisateur n'est plus le même : il **sait** que la
  carte est bonne.
- **Discovery :** a mémorisé les signaux d'intérêt (préférences) → la prochaine ouverture sera encore
  plus juste.
- **Pourquoi continuer ?** Parce qu'il a **déjà gagné quelque chose** en 30 s — une adresse, une
  envie, une confiance — pour un effort nul. Il rouvrira YOOTOO **pour le plaisir**, pas par besoin.

---

## La règle absolue, battement par battement

Chaque mouvement du film est justifié par un **mood** du Camera Engine — et le Scheduler garantit
qu'aucun autre ne se déclenche :

| Temps | Mouvement | Mood | Raison |
|---|---|---|---|
| 0 s | (aucun) | `restore`/`rest` | on accueille, on n'impressionne pas |
| 2 s | fondu éditorial | — (couche marqueurs) | révéler le meilleur, dans l'ordre |
| 5 s | (aucun) | `rest` | laisser l'œil choisir |
| 8 s | ease vers le commerce | `focus` | créer l'intimité |
| 8 s | décalage de cadrage | `adjust` (nudge) | garder le commerce au-dessus de la sheet |
| 12 s | (aucun) | `rest` | laisser lire |
| 18 s | (optionnel) ease court | `browse` | feuilleter sans re-vol |
| 25 s | suit le geste | *user > tout* | l'utilisateur gagne toujours |
| 30 s | léger dézoom | `return` | retrouver son contexte |

Le **silence** (`rest`) est le mouvement le plus fréquent du film — et c'est voulu.

---

## Accessibilité (le film tient sans mouvement)

Avec `reduce-motion`, la caméra **saute** au lieu d'animer et le fond ne s'incline pas. Le film ne
s'effondre pas : la découverte repose sur l'**apparition éditoriale**, la **hiérarchie des marqueurs**
et la **lisibilité du style** — pas sur le spectacle. Un utilisateur qui coupe les animations vit la
même histoire, en plus sobre.

---

## État réel (honnêteté) — ce qui porte ce film aujourd'hui

Ce storyboard est la **cible** ; voici ce qui existe déjà et ce qui reste à brancher :

| Brique du film | État |
|---|---|
| Marqueurs vivants (4 états, langage couleur, pop) | ✅ implémenté |
| Ranking éditorial + contexte (Discovery) | ✅ en prod |
| Camera Engine (mood/strategy/scheduler/bridge) | ✅ pur & testé |
| **Câblage caméra** (les moods qui bougent vraiment) | ⬜ **PR-C6** |
| **Apparition éditoriale au zoom** (le fondu 2 s) | 🟡 **Phase 5** |
| **Style de carte** (papier chaud) | 🟠 **proposé** (ADR-010) |
| Bottom sheet synchronisée (nudge à 8 s) | 🟡 cible |
| Vie contextuelle (18 s : marché/terrasse) | 🟡 Phase 6 |

Rien n'est inventé : le film **assemble** des briques posées ; les cases non cochées disent
exactement ce qu'il reste pour que ces 30 secondes deviennent réelles.

---

## Le test des 30 secondes (checklist de toute future feature)

Avant d'ajouter quoi que ce soit, on vérifie que ça **sert** ce film :
- [ ] Ça aide à **identifier** plus vite un bon commerce ? (sinon : bruit)
- [ ] Ça renforce la **qualité perçue** / la **confiance** ? (sinon : gadget)
- [ ] Ça donne davantage **envie de sortir** ? (sinon : hors-mission)
- [ ] Ça respecte le **silence** et le **geste** de l'utilisateur ? (sinon : ça lutte)
- [ ] Ça marche **sans mouvement** (reduce-motion) ? (sinon : fragile)

Une seule case non cochée = on retravaille. → [Design System §règle absolue](./README.md).
