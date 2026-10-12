# Plan de développement

Référence fonctionnelle : [SPECIFICATIONS.md](./SPECIFICATIONS.md).

Chaque étape aboutit à une app qui build, dont les tests passent, et donne lieu à un commit. Les étapes 1 à 6 constituent le MVP utilisable au quotidien ; la suite enrichit.

---

## Étape 0 — Initialisation du projet

- [x] Scaffold Vite + React + TypeScript.
- [x] Tailwind v4, react-router, Vitest.
- [x] oxlint (template Vite) + Prettier, scripts `dev`, `build`, `test`, `lint`, `typecheck`.
- [x] `engines.node` dans `package.json`, mise à jour du `.gitignore` (`node_modules`, `dist`).
- [x] Layout de base : header + navigation (Accueil, Réviser, Entraînement, Examen, Stats, Paramètres) avec pages vides.

**Terminé quand** : `npm run dev` affiche la navigation, `npm run build` et `npm test` passent.

---

## Étape 1 — Données et validation

- [ ] Créer `src/data/cards.json` avec la liste complète des `chapters` et migrer les cartes de `data/chapitre-1.json` (ajout du champ `chapter: 1`). Supprimer l'ancien fichier.
- [ ] `src/data/schema.ts` : schémas zod (union discriminée sur `type`) + types TS inférés.
- [ ] `src/data/cards.ts` : chargement, index par `id`, par chapitre, helpers de filtre (chapitres, K, tags, `lo`).
- [ ] Test de validation des données (schéma, unicité des ids, préfixe ↔ chapitre, index `correct`, etc.).

**Terminé quand** : le test de données passe et un test volontairement cassé (id dupliqué) échoue.

---

## Étape 2 — Affichage et correction des 4 types de cartes

- [ ] `lib/grading.ts` : correction `mcq` (ensemble exact), `true_false`, `ordering` + mélange garanti différent de l'ordre correct. Tests unitaires.
- [ ] Composants `FlashcardView`, `QcmView`, `TrueFalseView`, `OrderView` (dnd-kit, utilisable au doigt) et `CardRenderer`.
- [ ] Affichage de la correction + explication après réponse.
- [ ] Page de démo temporaire (ou page Entraînement minimale) pour parcourir toutes les cartes du chapitre 1.

**Terminé quand** : chaque type de carte se joue et se corrige correctement, sur desktop et mobile.

---

## Étape 3 — Persistance

- [ ] `lib/storage.ts` : lecture/écriture de `flashcards-qa:v1`, état par défaut, gestion d'un JSON corrompu (fallback + log), point d'entrée pour migrations.
- [ ] `state/store.tsx` : contexte React + `useStore()`, sauvegarde automatique à chaque modification.
- [ ] Enregistrement des réponses dans `answers`.
- [ ] Tests unitaires du module storage.

**Terminé quand** : les réponses survivent à un rechargement de page.

---

## Étape 4 — Révision avec FSRS

- [ ] `lib/srs.ts` : wrapper `ts-fsrs` (paramètres depuis `settings`), sérialisation des cartes FSRS, mapping des notes (§3.2 des specs).
- [ ] Constitution de la session : dues (les plus en retard d'abord) + nouvelles dans la limite du quota journalier (`newCardsIntroduced`).
- [ ] Réinsertion dans la session des cartes réapprises dans la journée.
- [ ] Page `Review` : filtres, carte courante, boutons de notation (flashcard) / « C'était facile » (auto-corrigées), compteur restant.
- [ ] Récapitulatif de fin de session.
- [ ] Tests : constitution de la file, quota journalier, mapping juste/faux → note.

**Terminé quand** : une session complète met à jour les échéances, et les cartes reviennent aux bonnes dates (vérifié par tests avec date simulée).

---

## Étape 5 — Tableau de bord

- [ ] `lib/stats.ts` : comptes dues / nouvelles / apprentissage / révision par chapitre, streak.
- [ ] Page `Dashboard` : bloc « aujourd'hui » + bouton Réviser, cartes de chapitre avec barre de progression, chapitres « à venir ».

**Terminé quand** : le dashboard reflète fidèlement l'état après une session.

---

## Étape 6 — Paramètres, import/export, déploiement

- [ ] Page `Settings` : nouvelles cartes/jour, rétention cible.
- [ ] Export (téléchargement du `StoredState`) et import (validation zod, confirmation, remplacement).
- [ ] Réinitialisation avec double confirmation.
- [ ] Déploiement Railway : `serve` en dépendance, script `start`, vérification du fallback SPA (rechargement sur `/review`).

**Terminé quand** : l'app est en ligne sur Railway et un export → reset → import restaure la progression.

> 🎯 **MVP atteint** : révision quotidienne utilisable sur desktop et mobile.

---

## Étape 7 — Entraînement libre

- [ ] Page `Practice` : filtres + taille de série + « uniquement mes erreurs ».
- [ ] Tirage aléatoire, réponses enregistrées en mode `practice`, aucun impact sur `srs`.
- [ ] Récapitulatif de fin de série.

---

## Étape 8 — Examen blanc

- [ ] `lib/exam.ts` : tirage selon la répartition officielle, redistribution au prorata si chapitres incomplets, durée ajustée, message d'avertissement. Tests unitaires (cas complet, cas chapitre 1 seul, cas total < 40).
- [ ] `ExamSetup` : composition prévue + avertissement + bouton Démarrer.
- [ ] `Exam` : chrono basé sur `startedAt`, navigation libre, grille de questions, marquage « à revoir », soumission manuelle/automatique, sauvegarde de `currentExam` (reprise après rechargement).
- [ ] `ExamResult` : score, réussite/échec, détail par chapitre et par K, correction question par question.
- [ ] Historique des examens.

**Terminé quand** : un examen se passe de bout en bout, résiste à un rechargement, et n'a aucun effet sur le planning FSRS.

---

## Étape 9 — Statistiques

- [ ] Réussite par chapitre et par `lo`, top des objectifs faibles avec lien vers un entraînement filtré.
- [ ] Activité des 30 derniers jours.
- [ ] Évolution des scores d'examen blanc.

---

## Étape 10 — Finitions

- [ ] Raccourcis clavier.
- [ ] Thème sombre, passe responsive complète, accessibilité (focus, contrastes, labels).
- [ ] États vides et messages d'erreur soignés.
- [ ] README (lancer le projet, ajouter des cartes, déployer).

---

## En parallèle — Contenu

Production des cartes des chapitres 2 à 6 dans `cards.json`, chapitre par chapitre, à partir du syllabus. Points d'attention :

- assez de **QCM** par chapitre pour l'examen blanc (viser au moins 3× le quota d'examen : ch.2 ≥ 18, ch.3 ≥ 12, ch.4 ≥ 33, ch.5 ≥ 27, ch.6 ≥ 6) ;
- exercices **K3** pour le chapitre 4 (partitions d'équivalence, valeurs limites, tables de décision, transitions d'état) et le chapitre 5 (estimation, priorisation, rapport de défaut) ;
- le test de validation des données doit passer à chaque ajout.
