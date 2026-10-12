# Pistes d'amélioration

Idées non planifiées, à reprendre plus tard. Chaque piste décrit l'intérêt, ce qu'il faudrait faire et les points d'attention.

## PWA installable et hors ligne

**Intérêt** : installer l'app sur le téléphone ou le bureau, l'ouvrir sans barre de navigateur, et réviser **hors ligne** (transports…). L'app s'y prête bien : tout est côté client, les cartes sont incluses dans le build et la progression est dans le `localStorage`.

**À faire**

- [ ] Ajouter `vite-plugin-pwa` : génération du manifest et d'un service worker (Workbox) qui met en cache toute l'app, y compris les pages chargées à la demande et les cartes.
- [ ] Manifest : nom « Flash Cards QA », nom court, icônes 192 px, 512 px et variante _maskable_ générées à partir de `public/favicon.svg`, couleurs du thème et de fond, `display: standalone`, `lang: fr`.
- [ ] `index.html` : `theme-color` (clair / sombre), `apple-touch-icon`, balises iOS pour le mode plein écran.
- [ ] Mises à jour : afficher un bandeau « Nouvelle version disponible — Recharger » plutôt qu'un rechargement automatique, qui pourrait couper un examen en cours.
- [ ] Recette : installation (Chrome desktop, Android, iOS), fonctionnement en mode avion, prise en compte d'une nouvelle version après déploiement.

**Points d'attention**

- Sur iOS, l'app installée sur l'écran d'accueil a **son propre stockage**, séparé de Safari : la progression faite dans Safari n'y apparaît pas. Prévoir un mot dans l'interface ou le README (passer par l'export / import).
- Le service worker doit être servi sans cache long, sinon les mises à jour tardent : vérifier les en-têtes envoyés par `serve` sur Railway (configurer `serve.json` si besoin).
- HTTPS obligatoire : déjà le cas sur Railway.

## Open Graph et aperçus de lien

**Intérêt** : un aperçu propre (titre, description, image) quand le lien est partagé sur Slack, Discord, WhatsApp, LinkedIn…

**À faire**

- [ ] Dans `index.html` : `og:title`, `og:description`, `og:type` (`website`), `og:url`, `og:image` (+ `og:image:width` / `height` / `alt`), `og:locale` (`fr_FR`), et `<meta name="description">`.
- [ ] Twitter / X : `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`.
- [ ] Image d'aperçu 1200 × 630 px dans `public/` (nom de l'app, « ISTQB CTFL v4.0 », visuel de carte), en PNG.
- [ ] Vérifier le rendu avec un outil de prévisualisation et en collant le lien dans une messagerie.

**Points d'attention**

- `og:url` et `og:image` doivent être des **URL absolues** : attendre le domaine Railway définitif (ou un domaine personnalisé).
- Les robots d'aperçu n'exécutent pas le JavaScript : les balises doivent être dans `index.html`, pas ajoutées par React. Elles seront donc identiques pour toutes les pages, ce qui suffit ici.

## Contenu et révision

- [ ] **Mélanger l'ordre des options des QCM à l'affichage** (révision, entraînement, examen), en conservant l'ordre mélangé dans l'examen en cours et son résultat. La position de la bonne réponse ne pourrait plus être mémorisée.
- [ ] **Rééquilibrer le chapitre 1** selon [REDACTION.md](REDACTION.md) : la bonne réponse est en B dans 28 QCM à réponse unique sur 41, les vrai/faux sont presque tous faux (13 sur 15), et des explications manquent.
