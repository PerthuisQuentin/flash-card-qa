# Tests end-to-end (Cypress)

## Lancer les tests

```bash
npm run dev       # terminal 1 : serveur Vite sur http://localhost:5173
npm run cy:open   # terminal 2 : interface Cypress (mode interactif)
npm run cy:run    # ou : exécution sans interface, dans le terminal
```

Les specs sont dans `cypress/e2e/*.cy.ts`. Cypress vide le `localStorage` entre chaque test : chaque test démarre avec une progression vierge.

## Sélecteurs : `data-cy`

Les éléments utiles aux tests portent un attribut `data-cy`, indépendant du texte affiché et du style. On les cible avec la commande `cy.getByCy()` (définie dans `cypress/support/e2e.ts`) :

```ts
cy.getByCy('practice-start').click()
```

Bonnes pratiques :

- **Cibler** avec `data-cy`, **vérifier** ce que voit l'utilisateur (texte, état) : `cy.getByCy('page-title').should('have.text', 'Révision')`.
- L'état d'un élément se lit dans ses attributs d'accessibilité, pas dans ses classes CSS : `aria-current` (onglet actif), `aria-pressed` (filtre ou drapeau activé), `aria-checked` (Vrai/Faux, taille de série), `aria-valuenow` (barre de réussite), `disabled`.
- Les éléments répétés (options de QCM, lignes de liste) partagent le même `data-cy` : utiliser `.eq(i)`, `.first()`, `.contains('texte')` ou `.should('have.length', n)`.
- Pour lire l'intérieur d'un bloc : `cy.getByCy('dashboard-streak').find('[data-cy=stat-value]')` ou `.within(() => …)`.
- Les options de QCM sont mélangées à chaque affichage : ne pas supposer que la bonne réponse est en position A. Les réponses attendues sont dans `src/data/cards.json` (importable dans un test).

Convention de nommage : `<zone>-<élément>` en anglais et en kebab-case (`review-start`, `exam-confirm-ok`). Un suffixe dynamique reprend un identifiant stable (`filter-chapter-3`, `exam-nav-12`, `practice-size-all`).

## Catalogue

Liste complète à jour : `grep -rhoE 'data-cy=[^ >]+' src | sort -u` (les noms construits dynamiquement apparaissent sous forme de gabarit).

### Partout

| `data-cy`                                                                         | Élément                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `nav-brand`                                                                       | Logo « Flash Cards QA » (lien vers l'accueil)                 |
| `main-nav`                                                                        | Barre de navigation                                           |
| `nav-home`, `nav-review`, `nav-practice`, `nav-exam`, `nav-stats`, `nav-settings` | Onglets                                                       |
| `page-title`                                                                      | Titre `<h1>` de la page                                       |
| `save-failed-alert`                                                               | Bandeau « Impossible d'enregistrer »                          |
| `stat-value`, `stat-label`, `stat-hint`                                           | Parties d'une tuile de statistique (à chercher dans la tuile) |
| `error-boundary`, `error-reload`                                                  | Écran d'erreur inattendue                                     |
| `not-found-home-link`                                                             | Lien de la page 404                                           |

### Carte (révision et entraînement)

| `data-cy`                                                                           | Élément                                                               |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `card-player`                                                                       | La carte entière                                                      |
| `card-header`, `card-type`, `card-lo`, `card-id`                                    | En-tête : type, objectif et niveau K, identifiant                     |
| `card-question`                                                                     | Énoncé                                                                |
| `card-submit`                                                                       | « Valider » ou « Afficher la réponse »                                |
| `card-feedback`, `card-result`, `card-explanation`                                  | Correction : bloc, « Bonne / Mauvaise réponse », explication          |
| `flashcard-hint`, `flashcard-answer`                                                | Flashcard : consigne, puis réponse affichée                           |
| `mcq-options`, `mcq-option`                                                         | QCM : groupe d'options, chaque option (cliquable)                     |
| `tf-true`, `tf-false`                                                               | Boutons Vrai / Faux                                                   |
| `ordering-list`, `ordering-item`, `ordering-handle`, `ordering-up`, `ordering-down` | Remise en ordre : liste, élément, poignée de glisser-déposer, flèches |
| `ordering-result`, `ordering-result-item`, `ordering-expected`                      | Remise en ordre corrigée, ordre attendu                               |
| `card-filter`                                                                       | Panneau de filtres                                                    |
| `filter-chapter-<1..6>`, `filter-level-<K1..K3>`, `filter-tag`                      | Filtres (`aria-pressed` indique s'ils sont actifs)                    |

### Accueil (`/`)

`dashboard-today`, `dashboard-today-summary`, `dashboard-review-cta`, `dashboard-practice-link`, `dashboard-exam-link`, `dashboard-streak`, `dashboard-answered-today`, `dashboard-cards-seen`, `dashboard-chapter-<1..6>`.

### Révision (`/review`)

- Préparation : `review-due`, `review-new`, `review-start`, `review-empty`, `review-filters`, `review-filters-toggle` (ouvre les filtres).
- Session : `review-session`, `review-progress`, `review-stop`, `review-rate-again`, `review-rate-hard`, `review-rate-good`, `review-rate-easy`, `review-continue` (après une mauvaise réponse).
- Bilan : `review-summary`, `review-summary-answered`, `review-summary-rate`, `review-next-due`, `review-restart`, `review-home-link`.

### Entraînement (`/practice`)

- Préparation : `practice-size-10`, `practice-size-20`, `practice-size-50`, `practice-size-all`, `practice-mistakes-only`, `practice-target-lo`, `practice-target-lo-remove`, `practice-start`.
- Session : `practice-session`, `practice-progress`, `practice-stop`, `practice-dont-know`, `practice-know` (flashcards), `practice-next`.
- Bilan : `practice-summary`, `practice-summary-answered`, `practice-summary-rate`, `practice-mistakes`, `practice-mistake`, `practice-retry-mistakes`, `practice-restart`, `practice-home-link`.

### Examen blanc (`/exam`)

- Accueil : `exam-plan`, `exam-warning`, `exam-quotas`, `exam-quota-<1..6>`, `exam-start`, `exam-history`, `exam-history-empty`, `exam-history-item`, `exam-pass-badge`.
- En cours : `exam-runner`, `exam-question-counter`, `exam-flag`, `exam-question`, `exam-prev`, `exam-next`, `exam-navigator`, `exam-nav-<1..40>`, `exam-timer`, `exam-answered-count`, `exam-finish`.
- Confirmation : `exam-confirm`, `exam-confirm-ok`, `exam-confirm-cancel`, `exam-confirm-abandon`.
- Résultat (`/exam/:id`) : `exam-result-header`, `exam-result-score`, `exam-pass-badge`, `exam-result-time`, `exam-result-correct`, `exam-result-unanswered`, `exam-result-by-chapter`, `exam-result-by-level`, `exam-result-breakdown-row`, `exam-result-mistakes-only`, `exam-result-questions`, `exam-result-question`, `exam-result-verdict`, `exam-result-no-mistakes`, `exam-result-back`.

### Statistiques (`/stats`)

`stats-answered`, `stats-success`, `stats-cards-seen`, `stats-exams-passed`, `stats-activity`, `stats-by-chapter`, `stats-chapter-<1..6>`, `stats-weakest`, `stats-exams`, `stats-exam-link`, `stats-objectives`, `stats-objective`, `stats-objective-lo`, `stats-practice-link`, `success-bar`, `activity-chart`, `activity-chart-summary`, `activity-chart-day`, `score-trend-chart`, `score-trend-summary`, `score-trend-point`.

### Paramètres (`/settings`)

- Révision : `settings-review`, `settings-new-cards`, `settings-new-cards-hint`, `settings-retention` (`<select>`, utiliser `.select()`).
- Sauvegarde : `settings-backup`, `settings-export`, `settings-import`, `settings-import-input` (champ fichier caché, utiliser `.selectFile()`), `settings-import-preview`, `settings-import-confirm`, `settings-import-cancel`, `settings-import-error`, `settings-import-done`.
- Réinitialisation : `settings-reset-section`, `settings-reset`, `settings-reset-confirm`, `settings-reset-cancel`, `settings-reset-done`.
