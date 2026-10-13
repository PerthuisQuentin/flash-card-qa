# Plan de recette

Recette manuelle de l'app, à dérouler avant une mise en ligne (≈ 45 min). Les tests automatisés (`npm test`) couvrent la logique ; cette recette vérifie le **rendu réel** et les parcours de bout en bout.

## Préparation

- `npm run build && npm start` → http://localhost:3000 (recette sur le build de production, pas le serveur de dev).
- Navigateurs : un desktop (Chrome ou Firefox) + un **mobile réel** (ou DevTools en 375 px).
- Partir d'un état vierge : DevTools → Application → Local Storage → supprimer `flashcards-qa:v1`.
- Pour consulter l'état : clé `flashcards-qa:v1` dans le Local Storage.

Légende : ☐ à faire · ✅ OK · ❌ KO (noter le détail en bas).

---

## 1. Navigation et structure

| #   | Action                                          | Attendu                                                                                        | ☐   |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | --- |
| 1.1 | Parcourir les 6 entrées du menu                 | Chaque page s'affiche, l'entrée active est surlignée, titre d'onglet « Page · Flash Cards QA » | ☐   |
| 1.2 | Recharger (F5) sur `/review`, `/stats`, `/exam` | La page se recharge sans 404 (fallback SPA)                                                    | ☐   |
| 1.3 | Ouvrir `/nimporte-quoi`                         | Page « Page introuvable » avec lien retour                                                     | ☐   |
| 1.4 | Desktop : `Tab` dès l'arrivée sur la page       | Le lien « Aller au contenu » apparaît et fonctionne                                            | ☐   |
| 1.5 | Mobile : menu                                   | Le menu défile horizontalement, aucun débordement de page                                      | ☐   |

## 2. Tableau de bord (état vierge)

| #   | Action             | Attendu                                                                                                                        | ☐   |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --- |
| 2.1 | Ouvrir l'accueil   | « 0 carte due · 20 nouvelles », bouton « Réviser (20) », série « 🔥 0 j »                                                      | ☐   |
| 2.2 | Cartes de chapitre | Chapitres avec cartes : nombre de cartes, 0 % vues ; chapitres sans cartes grisés « Cartes à venir » ; poids « ~N Q » corrects | ☐   |

## 3. Révision (FSRS)

| #    | Action                                                           | Attendu                                                                                                                                                                         | ☐   |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 3.1  | Réviser → « Commencer (20 cartes) »                              | 1re carte = c1-001 (flash card), compteur « 0 / 20 vues »                                                                                                                       | ☐   |
| 3.2  | Afficher la réponse                                              | Réponse multi-lignes lisible, « Tu connaissais la réponse ? » et 4 boutons (« Je ne savais pas » → « dans la session », « Je savais » → « dans 2 j »…), aucune durée en minutes | ☐   |
| 3.3  | Noter « Je savais »                                              | La carte suivante s'affiche ; compteur « 1 / 20 vues » (c1-001 part à 2 j, elle ne revient pas)                                                                                 | ☐   |
| 3.4  | Vrai/Faux : mauvaise réponse → Valider                           | « ✗ Mauvaise réponse », bon choix en vert, explication, « Revient dans la session » et bouton « Continuer » ; compteur « · 1 à repasser »                                       | ☐   |
| 3.5  | QCM à réponse unique : bonne réponse                             | « ✓ Bonne réponse », boutons « Continuer » (dans 2 j) et « Trop facile » (dans 8 j) ; options dans un ordre différent si la carte revient                                       | ☐   |
| 3.6  | QCM multi-réponses (ex. c1-006)                                  | Mention « Sélectionne 3 réponses », cases à cocher ; 2 sur 3 cochées = faux                                                                                                     | ☐   |
| 3.7  | Carte « remise en ordre » : glisser via ⋮⋮ (souris **et** doigt) | L'élément se déplace ; le scroll mobile reste possible hors poignée                                                                                                             | ☐   |
| 3.8  | Remise en ordre : flèches ▲▼ puis valider faux                   | Positions ✓/✗ et « Ordre attendu » affichés                                                                                                                                     | ☐   |
| 3.9  | « Terminer » en cours de session                                 | Bilan : nombre de réponses, % de réussite, prochaine échéance                                                                                                                   | ☐   |
| 3.10 | Revenir sur Réviser                                              | Nouvelles cartes restantes = 20 − cartes déjà introduites aujourd'hui                                                                                                           | ☐   |
| 3.11 | Filtres : ne garder que K1, puis tag « piège »                   | Les compteurs « dues / nouvelles » se mettent à jour ; chapitres sans cartes non sélectionnables                                                                                | ☐   |
| 3.12 | Paramètres → 0 nouvelle carte/jour, revenir sur Réviser          | « Rien à réviser » + prochaine échéance (si des cartes sont en cours)                                                                                                           | ☐   |

## 4. Entraînement libre

| #   | Action                                               | Attendu                                                                            | ☐   |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- | --- |
| 4.1 | Série de 10, répondre faux à 2 cartes, aller au bout | Progression « n / 10 », bilan avec 2 cartes « À retravailler »                     | ☐   |
| 4.2 | « Rejouer mes erreurs »                              | Série de 2 cartes, uniquement celles ratées                                        | ☐   |
| 4.3 | Nouvelle série + « Uniquement mes erreurs »          | Le bouton indique le bon nombre de cartes                                          | ☐   |
| 4.4 | Vérifier le tableau de bord après l'entraînement     | Cartes vues / dues **inchangées** (aucun impact FSRS), réponses du jour augmentées | ☐   |
| 4.5 | Flash card en entraînement                           | Boutons « Je ne savais pas » / « Je savais »                                       | ☐   |

## 5. Examen blanc

| #    | Action                                                                                                       | Attendu                                                                                                                                                                | ☐   |
| ---- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 5.1  | Ouvrir Examen blanc                                                                                          | « 40 questions · 60 min · 26/40 », tant que des chapitres manquent : avertissement « Chapitres … sans QCM » et composition réelle cohérente avec le tableau (total 40) | ☐   |
| 5.2  | Démarrer                                                                                                     | Chrono « 1:00:00 » puis 59:59… qui décompte, barre du bas toujours visible en scrollant (mobile compris)                                                               | ☐   |
| 5.3  | Répondre à 3 questions, en marquer 2 (🚩), naviguer via la grille                                            | Grille : répondues en indigo, marquées avec pastille orange, question courante entourée                                                                                | ☐   |
| 5.4  | Recharger la page en plein examen                                                                            | Examen repris, réponses, marquages et **ordre des options** conservés, chrono **non remis à zéro**                                                                     | ☐   |
| 5.5  | « Terminer »                                                                                                 | Confirmation dans la barre du bas : « Il reste 37 questions sans réponse… »                                                                                            | ☐   |
| 5.6  | « Terminer et corriger »                                                                                     | Page résultat : score, Réussi/Échoué, temps passé, détail par chapitre et par K, correction, options dans le même ordre que pendant l'examen                           | ☐   |
| 5.7  | Cocher « Uniquement les erreurs »                                                                            | Seules les questions fausses / sans réponse restent                                                                                                                    | ☐   |
| 5.8  | Retour aux examens                                                                                           | L'examen apparaît dans l'historique, cliquable                                                                                                                         | ☐   |
| 5.9  | Nouvel examen → Terminer → « Abandonner sans résultat »                                                      | Retour à l'accueil de l'examen, aucun ajout à l'historique                                                                                                             | ☐   |
| 5.10 | Expiration : démarrer un examen, puis dans la console modifier `startedAt` à −2 h (voir astuce) et recharger | Soumission automatique, résultat « temps écoulé », durée = 1 h                                                                                                         | ☐   |
| 5.11 | Après examens : tableau de bord / révision                                                                   | Aucun impact sur le planning ni sur les réponses enregistrées                                                                                                          | ☐   |

## 6. Statistiques

| #   | Action                                              | Attendu                                                                                            | ☐   |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --- |
| 6.1 | État vierge                                         | États vides explicites (« Pas encore assez de réponses », « Aucun examen passé »)                  | ☐   |
| 6.2 | Après les sections 3 à 5                            | Indicateurs cohérents ; colonne du jour dans l'activité                                            | ☐   |
| 6.3 | Survol / `Tab` sur une colonne d'activité           | Le texte au-dessus indique date, nombre de réponses et % de réussite                               | ☐   |
| 6.4 | Survol d'un point de la courbe d'examens, puis clic | Le texte décrit l'examen ; le clic ouvre son résultat                                              | ☐   |
| 6.5 | Objectif faible → « S'entraîner → »                 | Entraînement avec « Objectif ciblé : FL-x.y.z », nombre de cartes cohérent, « Retirer » fonctionne | ☐   |
| 6.6 | Mobile 375 px                                       | Graphiques lisibles, libellés sans chevauchement, tableau des objectifs sans débordement           | ☐   |

## 7. Paramètres et sauvegarde

| #   | Action                                                   | Attendu                                                                                | ☐   |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | --- |
| 7.1 | Nouvelles cartes/jour : taper 9999                       | Message d'erreur ; en quittant le champ, la valeur précédente revient                  | ☐   |
| 7.2 | Taper 30 + Entrée                                        | Valeur enregistrée (visible après rechargement, et sur le tableau de bord)             | ☐   |
| 7.3 | Exporter                                                 | Téléchargement de `flashcards-qa-backup-AAAA-MM-JJ.json` lisible                       | ☐   |
| 7.4 | Réinitialiser (Annuler, puis confirmer)                  | Annuler ne change rien ; confirmer remet tout à zéro (tableau de bord vierge)          | ☐   |
| 7.5 | Importer le fichier exporté                              | Aperçu « N cartes vues, M réponses » → Remplacer → progression et paramètres restaurés | ☐   |
| 7.6 | Importer un fichier invalide (ex. un `.json` quelconque) | « Fichier invalide, rien n'a été modifié » + détail                                    | ☐   |

## 8. Clavier (desktop)

| #   | Action                                                   | Attendu                                                     | ☐   |
| --- | -------------------------------------------------------- | ----------------------------------------------------------- | --- |
| 8.1 | Session de révision entière au clavier                   | `Entrée` révèle / valide, `1`–`4` notent, `V`/`F` répondent | ☐   |
| 8.2 | Carte « remise en ordre » : poignée + `Espace` / flèches | Le glisser-déposer clavier marche, sans valider la carte    | ☐   |
| 8.3 | Examen : `→`, `←`, `1`, `F`                              | Navigation, réponse, marquage                               | ☐   |
| 8.4 | Rappel des touches                                       | Visible sous les cartes sur desktop, absent sur mobile      | ☐   |

## 9. Transverse

| #   | Action                                                           | Attendu                                                                                                                                                     | ☐   |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 9.1 | Passer le système en **mode sombre**, parcourir toutes les pages | Contrastes corrects, pas de zone blanche, graphiques lisibles                                                                                               | ☐   |
| 9.2 | Deux onglets ouverts : répondre dans l'un, revenir dans l'autre  | L'autre onglet reflète la progression                                                                                                                       | ☐   |
| 9.3 | Navigation privée (Safari / Firefox strict)                      | L'app fonctionne ; si l'écriture échoue, bandeau d'alerte orange                                                                                            | ☐   |
| 9.4 | Lendemain (ou date système +1 j)                                 | Cartes arrivées à échéance dues, quota de nouvelles cartes réinitialisé ; série « 🔥 2 j » (vrai lendemain uniquement, l'astuce ne décale pas les réponses) | ☐   |

---

## Astuces

**Simuler un examen expiré (5.10)** — pendant un examen, dans la console :

```js
const key = 'flashcards-qa:v1'
const s = JSON.parse(localStorage.getItem(key))
s.currentExam.startedAt = new Date(Date.now() - 2 * 3600e3).toISOString()
localStorage.setItem(key, JSON.stringify(s))
location.reload()
```

**Simuler le passage des jours (9.4)** — décaler toutes les échéances d'un jour dans le passé :

```js
const key = 'flashcards-qa:v1'
const s = JSON.parse(localStorage.getItem(key))
for (const c of Object.values(s.srs)) c.due = new Date(Date.parse(c.due) - 864e5).toISOString()
localStorage.setItem(key, JSON.stringify(s))
location.reload()
```

## Anomalies relevées

| #   | Test | Description | Gravité | Statut |
| --- | ---- | ----------- | ------- | ------ |
|     |      |             |         |        |
