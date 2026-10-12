# Flash Cards QA — Spécifications

Application web de révision de la certification **ISTQB CTFL v4.0** (Testeur Certifié Niveau Fondation), par flash cards avec répétition espacée et examens blancs.

- Usage : personnel, mono-utilisateur, sans compte.
- Langue : français uniquement (pas d'i18n).
- Convention : **code en anglais** (identifiants, fichiers, routes, clés et valeurs d'énumération JSON, commentaires, commits) ; **interface et contenu des cartes en français**.
- Appareils : desktop et mobile (pas de synchronisation entre appareils ; import/export manuel).
- Hébergement : Railway, site statique.

---

## 1. Stack technique

| Domaine                         | Choix                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Build                           | Vite                                                                             |
| UI                              | React + TypeScript                                                               |
| Style                           | Tailwind CSS v4                                                                  |
| Routage                         | react-router                                                                     |
| Répétition espacée              | [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (algorithme FSRS) |
| Drag & drop (cartes `ordering`) | `@dnd-kit/core` + `@dnd-kit/sortable`                                            |
| Validation des données          | zod                                                                              |
| Lint / format                   | oxlint + Prettier                                                                |
| Tests                           | Vitest (+ Testing Library pour les composants critiques)                         |
| Persistance                     | `localStorage`                                                                   |
| Déploiement                     | Railway : `npm run build` puis `serve -s dist -l $PORT`                          |

Pas de backend, pas de base de données.

---

## 2. Données des cartes

### 2.1 Fichier unique

Toutes les cartes sont dans **`src/data/cards.json`**, importé directement dans le bundle.

```json
{
  "chapters": [
    { "id": 1, "title": "Fondamentaux des tests", "examQuestions": 8 },
    { "id": 2, "title": "Tester tout au long du cycle de vie du développement logiciel", "examQuestions": 6 },
    { "id": 3, "title": "Test statique", "examQuestions": 4 },
    { "id": 4, "title": "Analyse et conception des tests", "examQuestions": 11 },
    { "id": 5, "title": "Gestion des activités de test", "examQuestions": 9 },
    { "id": 6, "title": "Outils de test", "examQuestions": 2 }
  ],
  "cards": [ ... ]
}
```

La liste `chapters` est complète dès le départ ; un chapitre sans cartes est simplement affiché comme « à venir ».

### 2.2 Champs communs à toutes les cartes

| Champ         | Type                                                 | Description                                                                 |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `id`          | string                                               | Identifiant unique et **stable**, format `c<chapitre>-<nnn>` (ex. `c1-042`) |
| `chapter`     | number                                               | Numéro du chapitre (1 à 6)                                                  |
| `type`        | `"flashcard" \| "mcq" \| "true_false" \| "ordering"` | Type de carte                                                               |
| `section`     | string                                               | Section du syllabus (ex. `"1.4.3"`, ou `"mots-clés"`)                       |
| `lo`          | string                                               | Objectif d'apprentissage (ex. `"FL-1.4.3"`)                                 |
| `k`           | `"K1" \| "K2" \| "K3"`                               | Niveau de connaissance                                                      |
| `question`    | string                                               | Énoncé                                                                      |
| `explanation` | string?                                              | Explication affichée après la réponse                                       |
| `tags`        | string[]                                             | Ex. `scénario`, `piège`, `liste`, `mot-clé`, `glossaire`                    |

> ⚠️ **Règle d'or : un `id` n'est jamais modifié ni réutilisé.** La progression est indexée par `id` ; renuméroter ferait perdre l'historique. Une carte supprimée laisse un trou dans la numérotation.

### 2.3 Champs spécifiques par type

| Type         | Champs                                    | Comportement                                                                                                                           |
| ------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `flashcard`  | `answer: string` (peut contenir des `\n`) | Recto / verso, auto-évaluation                                                                                                         |
| `mcq`        | `options: string[]`, `correct: number[]`  | Une ou plusieurs bonnes réponses. Si `correct.length > 1`, l'UI l'indique (« plusieurs réponses »)                                     |
| `true_false` | `answer: boolean`                         | Deux boutons Vrai / Faux                                                                                                               |
| `ordering`   | `items: string[]`                         | `items` est stocké **dans le bon ordre** ; l'app les mélange à l'affichage (en garantissant que le mélange diffère de l'ordre correct) |

### 2.4 Validation

Un schéma zod (`src/data/schema.ts`) décrit ce format. Un test Vitest vérifie :

- conformité au schéma ;
- unicité des `id` ;
- cohérence `id` ↔ `chapter` (préfixe `c<chapter>-`) ;
- `chapter` présent dans `chapters` ;
- `lo` appartenant au chapitre de la carte (`FL-<chapter>.`) ;
- pas de champ inconnu (protection contre les fautes de frappe) ;
- index de `correct` valides et sans doublon ; `options.length >= 2`, sans doublon ;
- `items.length >= 2` et sans doublon pour `ordering`.

Le build échoue (via `npm test` en CI/pré-déploiement) si les données sont invalides.

---

## 3. Fonctionnalités

### 3.1 Tableau de bord (accueil)

- Nombre de cartes **dues aujourd'hui** + nouvelles cartes disponibles ; bouton « Réviser ».
- Par chapitre : nombre de cartes nouvelles / en apprentissage / en révision (maîtrisées), barre de progression ; mention « à venir » si le chapitre n'a pas de cartes.
- Série (streak) de jours de révision consécutifs.
- Accès rapide : entraînement libre, examen blanc, statistiques.

### 3.2 Révision (répétition espacée FSRS)

**Constitution de la session**

- Filtres : chapitres (multi-sélection), niveau K, tags. Par défaut : tout.
- Contenu : toutes les cartes **dues** du filtre, puis des **nouvelles** cartes dans la limite du quota journalier restant (paramètre, 20 par défaut).
- Ordre : cartes dues d'abord (les plus en retard en premier), puis nouvelles cartes (dans l'ordre du JSON, pour suivre la progression du syllabus).
- Une carte notée « À revoir » est réinsérée plus loin dans la session si FSRS la planifie dans la journée (étapes d'apprentissage).

**Notation (mapping vers FSRS)**

| Type                            | Interaction                        | Note FSRS                                                                            |
| ------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| `flashcard`                     | Retourner la carte, puis 4 boutons | Again / Hard / Good / Easy (choix utilisateur)                                       |
| `mcq`, `true_false`, `ordering` | Réponse corrigée automatiquement   | Faux → **Again** ; Juste → **Good** ; bouton optionnel « C'était facile » → **Easy** |

- Un QCM à réponses multiples n'est juste que si la sélection est **exactement** l'ensemble correct.
- Une carte `ordering` n'est juste que si l'ordre est entièrement correct.
- Après réponse : affichage de la correction (bonnes options surlignées, ordre correct) et de `explanation`.

**Fin de session** : récapitulatif (cartes vues, taux de réussite, prochaine échéance).

### 3.3 Entraînement libre

- Mêmes filtres que la révision + nombre de cartes (10 / 20 / 50 / toutes) + option « uniquement mes erreurs » (cartes dont la dernière réponse était fausse).
- Tirage aléatoire.
- **N'impacte pas** le planning FSRS (mais alimente les statistiques de réussite).

### 3.4 Examen blanc

**Règles**

- Uniquement les cartes de type **`mcq`**.
- 40 questions, **60 minutes**, seuil de réussite **65 % (26/40)**.
- Répartition officielle : ch.1 = 8, ch.2 = 6, ch.3 = 4, ch.4 = 11, ch.5 = 9, ch.6 = 2.
- Tirage aléatoire dans chaque chapitre ; options affichées dans l'ordre du JSON (pas de mélange, certaines options s'y référant).
- Notation tout-ou-rien par question.
- **N'impacte pas** le planning FSRS.

**Chapitres incomplets** (cas du démarrage)

- Si un chapitre a moins de QCM que son quota, on prend tout ce qui est disponible.
- Les questions manquantes sont redistribuées sur les autres chapitres au prorata de leur poids officiel, dans la limite de leurs QCM disponibles.
- Si le total reste < 40, l'examen est plus court ; la durée est ajustée au prorata (1,5 min/question) et le seuil reste à 65 %.
- Un **avertissement** explique la composition réelle (« Chapitres 2 à 6 indisponibles : examen composé de 40 questions du chapitre 1 »).

**Déroulement**

- Chronomètre visible ; à 0, soumission automatique.
- Navigation libre entre questions, grille de progression (répondue / non répondue / marquée « à revoir »).
- Bouton « Terminer » avec confirmation s'il reste des questions sans réponse.
- Un examen en cours est sauvegardé (reprise possible après rechargement ; le temps continue de s'écouler sur la base de `startedAt`).

**Résultats**

- Score global, réussi / échoué, temps passé.
- Score par chapitre et par niveau K.
- Correction détaillée de chaque question (réponse donnée, réponse attendue, explication).
- Historique des examens (date, score, durée) consultable.

### 3.5 Statistiques

- Taux de réussite par chapitre et par objectif d'apprentissage (`lo`), sur l'ensemble des réponses (révision + entraînement).
- Top des objectifs les plus faibles → lien vers un entraînement filtré sur cet objectif.
- Activité par jour (nombre de cartes révisées) sur les 30 derniers jours.
- Évolution des scores d'examen blanc.

### 3.6 Paramètres

- Nombre de nouvelles cartes par jour (défaut 20).
- Rétention cible FSRS (défaut 0,9).
- **Exporter** la progression (téléchargement d'un fichier `flashcards-qa-backup-YYYY-MM-DD.json`).
- **Importer** une progression (remplace l'existante après confirmation ; validation zod du fichier).
- Réinitialiser toute la progression (double confirmation).

### 3.7 Transverse

- Responsive, **mobile first**.
- Thème clair/sombre selon le système.
- Raccourcis clavier (desktop) : `Espace` retourner / valider, `1`–`4` notation ou choix d'option, `V`/`F` vrai/faux, `Entrée` question suivante.
- Les cartes dont l'`id` n'existe plus dans le JSON sont ignorées (leur progression est conservée dans le stockage mais non affichée).

---

## 4. Persistance (localStorage)

Clé unique : **`flashcards-qa:v1`**. Le champ `version` permet des migrations futures.

```ts
interface StoredState {
  version: 1
  settings: {
    newCardsPerDay: number // 20
    desiredRetention: number // 0.9
  }
  // État FSRS par carte (cartes jamais vues absentes)
  srs: Record<
    CardId,
    {
      due: string // ISO
      stability: number
      difficulty: number
      elapsed_days: number
      scheduled_days: number
      reps: number
      lapses: number
      state: 0 | 1 | 2 | 3 // New, Learning, Review, Relearning
      last_review?: string // ISO
    }
  >
  // Historique de toutes les réponses (révision + entraînement)
  answers: Array<{
    cardId: CardId
    at: string // ISO
    correct: boolean
    mode: 'review' | 'practice'
    rating?: 1 | 2 | 3 | 4 // présent en mode review
  }>
  // Compteur de nouvelles cartes introduites, par jour local (YYYY-MM-DD)
  newCardsIntroduced: Record<string, number>
  exams: ExamResult[]
  currentExam?: ExamInProgress
}
```

- Lecture/écriture centralisées dans un module `storage` ; les dates sont sérialisées en ISO.
- Le format d'export = exactement `StoredState`.
- Volume estimé : ~500 cartes × quelques réponses → largement sous la limite de 5 Mo.

---

## 5. Architecture du code

```
src/
  data/
    cards.json          # toutes les cartes
    schema.ts           # schémas zod + types TS inférés
    cards.ts            # chargement, index par id / chapitre, helpers de filtre
  lib/
    storage.ts          # lecture/écriture localStorage, migrations, import/export
    srs.ts              # wrapper ts-fsrs : file de session, notation, mapping
    exam.ts             # tirage et répartition de l'examen, scoring
    grading.ts          # auto-grading of mcq / true_false / ordering
    stats.ts            # agrégats pour le dashboard et les statistiques
  state/
    store.tsx           # contexte React + hook useStore() persistant
  components/
    cards/              # FlashcardView, QcmView, TrueFalseView, OrderView, CardRenderer
    ui/                 # boutons, barres de progression, filtres…
  pages/
    Dashboard.tsx
    Review.tsx
    Practice.tsx
    ExamSetup.tsx, Exam.tsx, ExamResult.tsx
    Stats.tsx
    Settings.tsx
  main.tsx, App.tsx
```

Principe : toute la logique métier (SRS, examen, correction, stats) vit dans `lib/` sous forme de fonctions pures testées ; les composants ne font que de l'affichage.

---

## 6. Déploiement Railway

- Service unique lié au dépôt GitHub.
- Build : `npm ci && npm run build`.
- Start : `npx serve -s dist -l $PORT` (`serve` en dépendance de production ; `-s` pour le fallback SPA de react-router).
- Version de Node fixée via `engines` dans `package.json` (ou `.nvmrc`).

---

## 7. Hors périmètre (pour l'instant)

- Comptes utilisateurs, synchronisation multi-appareils, backend.
- Édition des cartes depuis l'interface.
- Internationalisation.
- PWA / mode hors ligne (possible plus tard).
