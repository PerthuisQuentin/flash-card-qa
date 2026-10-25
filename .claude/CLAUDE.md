# Flash Cards QA

Personal web app to prepare the ISTQB CTFL v4.0 certification: FSRS spaced repetition, free practice, timed mock exams, stats. Client-only (no backend), progress in `localStorage`, deployed on Railway.

- What the app does and why: `docs/SPECIFICATIONS.md` (source of truth, keep it up to date when behavior changes).
- Development plan and content targets: `docs/PLAN.md`. Manual acceptance plan: `docs/RECETTE.md`. Improvement backlog: `docs/AMELIORATIONS.md`.
- Source PDFs (syllabus, summary) live in `resources/`, gitignored for copyright: never commit them or quote them at length.

## Conventions

- **Code in English, UI in French.** Identifiers, file names, routes (`/review`, `/practice`, `/exam`…), JSON enum values (`mcq`, `true_false`, `ordering`…), comments and commit messages are in English. Everything the user reads (UI text, card content, docs in `docs/`) is in French.
- Prettier: no semicolons, single quotes, width 100. Run `npm run format` after edits (it also reformats code blocks in Markdown).
- UI elements carry `data-cy` hooks for Cypress (`<area>-<element>`, kebab-case English). Add them to new interactive or asserted elements and keep the catalogue in `cypress/README.md` in sync.
- Lint is oxlint with React rules: no impure calls (`new Date()`, `Math.random()`) during render (use lazy `useState`, event handlers, or values passed in), no ref writes during render.

## Commands

```bash
npm run dev          # Vite dev server
npm test             # Vitest (includes cards.json validation)
npm run typecheck    # tsc -b
npm run lint         # oxlint
npm run build        # production build in dist/
npm start            # serve dist/ with SPA fallback on $PORT
```

Before declaring work done: `npm run typecheck && npm run lint && npm test`. Railway runs `npm test && npm run build`, so a failing test blocks the deploy.

## Architecture

- `src/data/` — `cards.json` (all chapters, single file), zod schema, filter helpers.
- `src/lib/` — pure, unit-tested business logic: `srs` (ts-fsrs), `exam`, `stats`, `practice`, `grading`, `storage` (schema, migrations, import/export), `format`.
- `src/state/` — `StoreProvider` / `useStore`: persisted state, cross-tab sync via the `storage` event.
- `src/components/`, `src/pages/` — React 19 + Tailwind v4, lazy-loaded routes, react-router (import from `'react-router'`).

Keep logic in `src/lib/` as pure functions taking `now` explicitly, and test it there; pages stay thin.

## Card data (`src/data/cards.json`)

- **Never change or reuse a card `id`** (`c<chapter>-<nnn>`): stored progress is keyed on it.
- Types: `flashcard` (`answer` text), `mcq` (`options` + 0-based `correct`), `true_false` (boolean `answer`), `ordering` (`items` in the correct order).
- Each card has `section`, `lo` (`FL-x.y.z`) and `k` (`K1`–`K3`) matching the syllabus; `explanation` and `tags` are optional but encouraged.
- **Writing rules for card content: `docs/REDACTION.md`** (read it before adding or editing cards).
- The mock exam only draws `mcq` cards, following the official distribution per chapter (8/6/4/11/9/2).
- `npm test` validates the file (strict schema, unique ids, chapter/LO consistency, answer indexes).

## Persisted state

- Key `flashcards-qa:v1`, validated with zod on load and import. Any schema change must stay backward compatible (optional field) or bump the version with a step in `migrate()`.
- Corrupt data is backed up under `flashcards-qa:v1:corrupt:<iso>` instead of being lost.

## Tests

- Vitest; component tests start with `// @vitest-environment jsdom` and call `afterEach(cleanup)`.
- Use `memoryStorage()` from `src/test/memoryStorage.ts` to inject storage into `StoreProvider`.
- FSRS fuzz is disabled in tests for deterministic intervals.

## Workflow

- Work step by step; the user reviews each step and explicitly says when to commit. Don't commit or push unprompted.
- Commit messages: English, imperative summary line, bullet details.
- The `origin` remote is HTTPS without stored credentials; SSH to GitHub works.
