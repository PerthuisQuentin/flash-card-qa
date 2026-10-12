# Règles de rédaction des cartes

Guide pour écrire ou relire les cartes de `src/data/cards.json`. Le format technique (champs, validation) est décrit dans les [spécifications](SPECIFICATIONS.md#2-données-des-cartes) ; ce document porte sur le **contenu**.

## 1. Source et fidélité

- La seule référence est le **syllabus ISTQB CTFL v4.0** (traduction CFTL, dans `resources/`, non versionné). En cas de doute, le syllabus a raison, pas l'intuition ou une autre certification.
- **Reformuler, ne pas recopier** : pas de paragraphes entiers du syllabus. Une définition courte peut être reprise quand la formulation exacte compte (mots-clés).
- Employer le **vocabulaire officiel français** du syllabus et du glossaire CFTL (« défaillance », « objet de test », « base de test », « testware »…), avec la même orthographe d'une carte à l'autre.
- Rester dans le périmètre du syllabus : pas de questions sur des notions qu'il ne traite pas.

## 2. Couverture d'un chapitre

- **Chaque objectif d'apprentissage** (`FL-x.y.z`) du chapitre a au moins quelques cartes, et chaque mot-clé du chapitre au moins une.
- Le champ `k` reprend le **niveau K de l'objectif** dans le syllabus, pas la difficulté ressentie.
- Les objectifs **K3** se travaillent par des exercices : petit scénario chiffré, une seule réponse juste (partitions d'équivalence, valeurs limites, tables de décision, transitions d'état, estimation, priorisation…).
- Viser assez de **QCM** pour l'examen blanc : au moins 3 × le quota d'examen du chapitre (voir [PLAN.md](PLAN.md#en-parallèle--contenu)).
- Mélange indicatif, d'après le chapitre 1 : environ 50 % de QCM, 25 % de flash cards, 15 % de vrai/faux, quelques remises en ordre.
- Varier les angles sur un même objectif : définition, distinction entre deux notions proches, scénario concret, idée reçue, liste à connaître.

## 3. Règles par type

### Flash card (`flashcard`)

- Une question **précise**, qui appelle une réponse que l'on peut s'auto-évaluer honnêtement (« Quels sont les 7 principes du test ? » plutôt que « Parle-moi des principes »).
- Réponse **courte** : une phrase, ou une liste avec un élément par ligne (`\n`).
- Idéale pour les définitions, les listes et les distinctions (« Différence entre erreur, défaut et défaillance ? »).

### QCM (`mcq`)

C'est le seul type utilisé à l'examen blanc : il doit ressembler aux questions officielles.

- **4 options**, **une seule bonne réponse** dans la grande majorité des cas, comme à l'examen.
- Plusieurs bonnes réponses : à réserver aux listes du syllabus. Ajouter « (plusieurs réponses) » à la fin de l'énoncé ; l'app affiche en plus « Sélectionne N réponses ».
- **Énoncé autonome** : compréhensible seul, sans référence à une autre carte (les questions d'examen sont tirées au hasard).
- **Distracteurs plausibles** : notions voisines du même chapitre, confusions classiques, formulations presque justes. Pas d'option absurde ni humoristique.
- Options de **longueur et de forme comparables** : la bonne réponse ne doit pas se reconnaître parce qu'elle est la plus longue ou la plus nuancée.
- Éviter « Toutes les réponses ci-dessus » et « Aucune de ces réponses ».
- Négations et mots-pièges **en majuscules** dans l'énoncé : « Lequel n'est PAS… », « Quel est l'INCONVÉNIENT… ».
- **Varier la position de la bonne réponse** (A, B, C, D à peu près à parts égales) : l'app n'affiche pas les options dans un ordre aléatoire. Le chapitre 1 a trop souvent la bonne réponse en B : à rééquilibrer.
- `explanation` : dire pourquoi la bonne réponse est juste et, si utile, pourquoi le distracteur le plus tentant est faux.

### Vrai / Faux (`true_false`)

- **Une seule affirmation**, sans ambiguïté : elle doit être entièrement vraie ou clairement fausse selon le syllabus.
- Bien adapté aux idées reçues (« Le test peut prouver l'absence de défauts. »), à taguer `idée reçue` ou `piège`.
- **Équilibrer vrai et faux** : sinon répondre « Faux » devient un réflexe. Le chapitre 1 (13 faux pour 2 vrais) est à rééquilibrer.
- `explanation` obligatoire : corriger l'affirmation quand elle est fausse.

### Remise en ordre (`ordering`)

- Seulement pour une séquence qui a **un ordre unique** dans le syllabus (activités du processus de test, étapes du débogage, d'une revue…).
- **3 à 7 éléments**, courts, écrits dans `items` **dans le bon ordre** (l'app les mélange).
- `explanation` : rappeler la logique de l'enchaînement.

## 4. Champs communs

- `id` : `c<chapitre>-<nnn>`, à la suite du dernier id du chapitre. **Un id n'est jamais modifié ni réutilisé** ; une carte supprimée laisse un trou.
- Cartes rangées dans le fichier par chapitre puis par section du syllabus.
- `section` et `lo` : ceux du syllabus (`"1.4.3"`, `"FL-1.4.3"`).
- `explanation` : fortement recommandée partout, obligatoire pour les vrai/faux et les remises en ordre. Elle apporte une information en plus (exemple, nuance, lien avec un principe), pas une simple répétition de la réponse.
- `tags` : 1 à 3, en minuscules et en français. **Réutiliser les tags existants** avant d'en créer un nouveau. Tags transverses :
  - `scénario` : mise en situation ;
  - `exercice` : application chiffrée d'une technique (objectifs K3) ;
  - `piège` : formulation ou confusion fréquente à l'examen ;
  - `idée reçue` : croyance courante contredite par le syllabus ;
  - `liste` : énumération à connaître ;
  - `mot-clé` / `glossaire` / `définition` : vocabulaire ;
  - `ordre` : séquence à connaître.

  Les autres tags sont thématiques (`principes`, `testware`, `indépendance`…).

## 5. Style

- Français correct et neutre, en tutoyant comme l'interface (« Remets dans l'ordre… »).
- Phrases courtes ; un énoncé ne teste qu'une seule notion.
- Pas d'abréviation non définie dans le syllabus.

## 6. Avant de valider un lot

- [ ] `npm test` passe (schéma, ids, cohérence chapitre / objectif, index des réponses).
- [ ] Chaque objectif du chapitre est couvert, les K3 ont des exercices.
- [ ] Le nombre de QCM atteint la cible du chapitre.
- [ ] Les bonnes réponses des QCM sont bien réparties entre A, B, C et D ; les vrai/faux sont équilibrés.
- [ ] Relecture rapide dans l'app (entraînement filtré sur le chapitre) pour repérer les énoncés ambigus.
