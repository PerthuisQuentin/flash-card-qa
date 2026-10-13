# Flash Cards QA

Application web personnelle pour réviser la certification **ISTQB CTFL v4.0** (Testeur Certifié Niveau Fondation) : flash cards avec répétition espacée, entraînement libre, examens blancs chronométrés et statistiques.

Tout fonctionne dans le navigateur : pas de compte, pas de backend. La progression est stockée dans le `localStorage` et peut être exportée / importée en JSON.

## Fonctionnalités

- **Révision** — répétition espacée [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) : cartes dues + quota quotidien de nouvelles cartes, intervalle prévu affiché sur chaque bouton de notation.
- **4 types de cartes** — flash card (auto-évaluée), QCM (une ou plusieurs réponses), vrai/faux, remise en ordre (glisser-déposer ou flèches).
- **Entraînement libre** — séries aléatoires filtrées (chapitres, niveau K, tags, objectif), mode « mes erreurs », sans impact sur le planning.
- **Examen blanc** — 40 QCM selon la répartition officielle, 60 min, seuil 65 %, reprise après rechargement, correction détaillée et historique.
- **Statistiques** — activité sur 30 jours, réussite par chapitre et par objectif, objectifs à retravailler, évolution des scores d'examen.
- **Paramètres** — nouvelles cartes par jour, rétention cible, export / import / réinitialisation.

### Raccourcis clavier

| Contexte                       | Touches                                                                  |
| ------------------------------ | ------------------------------------------------------------------------ |
| Carte (avant réponse)          | `1`–`n` choisir une option · `V` / `F` vrai / faux · `Entrée` valider    |
| Révision — flash card          | `1` je ne savais pas · `2` j'ai hésité · `3` je savais · `4` trop facile |
| Révision — carte auto-corrigée | `Entrée` continuer · `4` trop facile                                     |
| Entraînement — flash card      | `1` je ne savais pas · `2` je savais                                     |
| Entraînement — après réponse   | `Entrée` carte suivante                                                  |
| Examen blanc                   | `1`–`4` répondre · `←` `→` naviguer · `F` marquer à revoir               |

Les raccourcis sont désactivés dans les champs de saisie, et les cartes « remise en ordre » gardent la gestion clavier du glisser-déposer.

## Démarrer

Prérequis : Node.js ≥ 22.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script               | Rôle                                                      |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Serveur de développement Vite                             |
| `npm test`           | Tests (Vitest), dont la validation des données            |
| `npm run test:watch` | Tests en mode watch                                       |
| `npm run typecheck`  | Vérification TypeScript                                   |
| `npm run lint`       | oxlint                                                    |
| `npm run format`     | Prettier                                                  |
| `npm run build`      | Build de production dans `dist/`                          |
| `npm start`          | Sert `dist/` (fallback SPA) sur `$PORT` (3000 par défaut) |

## Ajouter ou modifier des cartes

Toutes les cartes sont dans [`src/data/cards.json`](src/data/cards.json). Le format complet est décrit dans les [spécifications](docs/SPECIFICATIONS.md#2-données-des-cartes).

```json
{
  "id": "c2-001",
  "chapter": 2,
  "type": "mcq",
  "section": "2.2.3",
  "lo": "FL-2.2.3",
  "k": "K2",
  "question": "Quel test vérifie qu'un défaut corrigé l'est bien ?",
  "options": ["Test de régression", "Test de confirmation", "Test d'acceptation", "Test statique"],
  "correct": [1],
  "explanation": "Le test de confirmation rejoue le test qui avait échoué.",
  "tags": ["piège"]
}
```

Règles :

- **Ne jamais modifier ni réutiliser un `id`** : la progression y est rattachée. Une carte supprimée laisse un trou dans la numérotation.
- Types : `flashcard` (`answer` texte), `mcq` (`options` + `correct`, index à partir de 0), `true_false` (`answer` booléen), `ordering` (`items` **dans le bon ordre**, mélangés à l'affichage).
- Règles de rédaction des questions : [docs/REDACTION.md](docs/REDACTION.md).
- `npm test` valide le fichier (schéma strict, ids uniques, cohérence chapitre / objectif, index des réponses) : lance-le après chaque ajout.

## Structure

```
src/
  data/         cards.json, schéma zod, helpers de filtre
  lib/          logique métier pure et testée (srs, exam, stats, practice, grading, storage, format)
  state/        store React persistant (localStorage) et transitions d'état
  hooks/        useHotkeys
  components/   cartes, graphiques, UI
  pages/        Dashboard, Review, Practice, Exam (+ exam/), Stats, Settings
docs/           spécifications et plan de développement
```

Conventions : code (identifiants, fichiers, routes, commentaires, commits) en anglais ; interface et contenu des cartes en français.

## Déploiement (Railway)

Le service est décrit par [`railway.json`](railway.json) :

- build : `npm test && npm run build` (des données invalides bloquent le déploiement) ;
- start : `npm start` (`serve -s dist` sur le `PORT` fourni par Railway) ;
- healthcheck sur `/`.

Il suffit de créer un service Railway à partir du dépôt GitHub.

## Documentation

- [Spécifications](docs/SPECIFICATIONS.md)
- [Plan de développement](docs/PLAN.md)
- [Règles de rédaction des cartes](docs/REDACTION.md)
- [Plan de recette](docs/RECETTE.md)
- [Pistes d'amélioration](docs/AMELIORATIONS.md)

Le contenu des cartes est rédigé à partir du syllabus ISTQB CTFL v4.0 (traduction CFTL), qui n'est pas inclus dans ce dépôt.
