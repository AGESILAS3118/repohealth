# RepoHealth v1.0

[![CI](https://github.com/AGESILAS3118/repohealth/actions/workflows/ci.yml/badge.svg)](https://github.com/AGESILAS3118/repohealth/actions)
[![Licence : MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Un outil web gratuit, 100 % côté navigateur et hébergé sur GitHub Pages. Il analyse la santé d’un dépôt GitHub public et attribue une note sur 100 avec une lettre (A+ à F), en français et en anglais, sans installation ni ligne de commande.

📖 *[Read English version (README.md)](README.md)*  
📑 *[Documentation de la méthodologie de scoring (docs/scoring.md)](docs/scoring.md)*
📝 *[Journal des modifications (CHANGELOG.md)](CHANGELOG.md)*

---

## 🚀 Fonctionnalités

- **Web Vanilla Pur** : HTML5, CSS Moderne et modules ES natifs. Aucun outil de build imposé, aucun framework, aucune dépendance d'exécution externe.
- **Moteur de Scoring (0 à 100 & A+ à F)** : Architecture modulaire et transparente basée sur les standards ouverts de la communauté.
- **Pilier Documentation (20 %)** : Diagnostic complet sur 9 critères (présence du README, volume > 800 car., structure en titres, blocs de code, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SUPPORT, CHANGELOG).
- **Recommandations Priorisées** : Plan d'action classé par gain de points estimé avec niveau de priorité (`haute`, `moyenne`, `basse`).
- **Client GitHub REST v3** : Client conforme aux spécifications GitHub API (`2022-11-28`) avec en-têtes obligatoires.
- **Cache Local Intelligent** : Mise en cache `localStorage` avec TTL d'une heure pour préserver le quota d'appels API.
- **Gestion Active du Rate Limit** : Analyse des en-têtes `X-RateLimit-*`, mémorisation du quota restant et affichage de l'heure exacte de réinitialisation.
- **Orchestration Plafonnée à 9 Requêtes** : Exécution structurée de 9 requêtes max par diagnostic avec tolérance aux erreurs 404 non bloquantes (ex: dossier `.github` absent).
- **Sécurité et Vie Privée** : Politique de sécurité de contenu (CSP) stricte, zéro télémétrie, aucun appel réseau vers des tiers, aucun cookie.
- **Bilingue (FR / EN)** : Détection automatique de la langue du navigateur avec bascule manuelle mémorisée dans `localStorage`.
- **Thème Sombre / Clair** : Détection et synchronisation avec les préférences système, mémorisation du choix utilisateur.
- **Support PWA** : Socle hors-ligne avec `manifest.webmanifest` et Service Worker (`sw.js`).
- **Export JSON du rapport** : Téléchargement d'une copie structurée et versionnée du rapport pour archivage ou traitement ultérieur.
- **Tests Natifs Node** : Suite de tests unitaire complète avec le module natif `node:test`.

---

## 📁 Arborescence du Dépôt

```text
repohealth/
├─ .github/workflows/
│  ├─ ci.yml                # Workflow GitHub Actions de tests
│  └─ deploy.yml            # Déploiement GitHub Pages
├─ .nojekyll                # Désactive le traitement Jekyll sur GitHub Pages
├─ docs/
│  └─ scoring.md            # Documentation bilingue de la méthodologie de calcul
├─ icons/
│  ├─ icon-192.png          # Icône PWA carrée (192x192)
│  ├─ icon-512.png          # Icône PWA carrée et maskable (512x512)
│  └─ icon.svg              # Source vectorielle de l'icône
├─ index.html               # Point d'entrée sémantique avec CSP stricte
├─ manifest.webmanifest     # Manifest pour Progressive Web App
├─ screenshots/
│  ├─ desktop.png           # Capture desktop (1280x720)
│  ├─ desktop.svg           # Source de la capture desktop
│  ├─ mobile.png            # Capture mobile (750x1334)
│  └─ mobile.svg            # Source de la capture mobile
├─ sw.js                    # Service Worker minimal pour mise en cache
├─ package.json             # Configuration ES Module et script de test
├─ .gitignore               # Fichiers exclus du versionnement Git
├─ LICENSE                  # Licence MIT
├─ PRD_RepoHealth.md        # Cahier des exigences produit
├─ README.md                # Documentation en anglais
├─ README.fr.md             # Documentation en français
├─ src/
│  ├─ main.js               # Logique d'initialisation (i18n, DOM, rendu du scoring)
│  ├─ api/
│  │  ├─ github.js          # Client API REST v3 (headers stricts, gestion d'erreurs)
│  │  ├─ cache.js           # Wrapper localStorage avec TTL 1h et purge auto
│  │  ├─ rateLimit.js       # Analyseur d'en-têtes et suivi du rate limit
│  │  └─ analyze.js         # Orchestrateur de diagnostic (max 9 requêtes)
│  ├─ scoring/
│  │  ├─ engine.js          # Moteur de pondération et calcul de ScoreReport
│  │  ├─ grades.js          # Table de conversion du score en mention (A+ à F)
│  │  ├─ types.js           # Définitions JSDoc des types du moteur
│  │  ├─ version.js         # Version centrale du moteur de scoring
│  │  └─ pillars/
│  │     ├─ activity.js     # Calcul du pilier Activité
│  │     ├─ cicd.js         # Calcul du pilier CI/CD
│  │     ├─ codeQuality.js  # Calcul du pilier Qualité du code
│  │     ├─ community.js    # Calcul du pilier Communauté
│  │     ├─ documentation.js# Calcul du pilier Documentation
│  │     ├─ hygiene.js      # Calcul du pilier Hygiène du dépôt
│  │     └─ security.js     # Calcul du pilier Sécurité
│  ├─ badge/
│  │  └─ generate.js        # Génération du badge SVG côté client
│  ├─ export/
│  │  └─ json.js            # Sérialisation versionnée du rapport JSON
│  ├─ i18n/
│  │  ├─ fr.json            # Dictionnaire français
│  │  └─ en.json            # Dictionnaire anglais
│  └─ utils/
│     └─ url.js             # Analyse et validation d'entrées GitHub (owner/repo, URL)
└─ tests/
   ├─ activity.test.js      # Tests du pilier Activité
   ├─ analyze.test.js       # Tests d'orchestration de l'analyse
   ├─ badge.test.js         # Tests du générateur de badge SVG
   ├─ cache.test.js         # Tests du cache local et du TTL
   ├─ cicd.test.js          # Tests du pilier CI/CD
   ├─ codeQuality.test.js   # Tests du pilier Qualité du code
   ├─ community.test.js     # Tests du pilier Communauté
   ├─ documentation.test.js # Tests du pilier Documentation
   ├─ engine.test.js        # Tests du rapport et de l'agrégation pondérée
   ├─ export.test.js        # Tests du payload d'export JSON
   ├─ github.test.js        # Tests du client API GitHub
   ├─ grades.test.js        # Tests des seuils de grades
   ├─ hygiene.test.js       # Tests du pilier Hygiène
   ├─ i18n.test.js          # Tests de parité des traductions
   ├─ mainUi.test.js        # Tests du rendu et du paramètre d'URL
   ├─ manifest.test.js      # Tests des assets et dimensions du manifest PWA
   ├─ rateLimit.test.js     # Tests de gestion du rate limit
   ├─ security.test.js      # Tests du pilier Sécurité
   └─ url.test.js           # Tests du parseur d'entrée GitHub
```

---

## 🛠️ Démarrage Local

Les modules ES (`type="module"`) et les Service Workers nécessitent un serveur HTTP pour s'exécuter (ne pas ouvrir directement en double-cliquant sur le fichier `file://`) :

### 1. Démarrer un serveur local
Avec Python 3 :
```bash
python3 -m http.server 8080
```
Ou avec Node.js `npx` :
```bash
npx serve .
```

### 2. Accéder à l'application
Ouvrez votre navigateur sur :
```text
http://localhost:8080
```

---

## 🧪 Lancement des Tests

RepoHealth utilise le moteur de test natif de Node.js (aucune installation préalable de paquets n'est requise) :

```bash
npm test
```

La suite contient actuellement 130 tests répartis dans 18 fichiers.

## 🚀 Déploiement

Prérequis : un dépôt GitHub public et une branche `main`.

1. Créez le dépôt public [AGESILAS3118/repohealth](https://github.com/AGESILAS3118/repohealth).
2. Poussez le code sur la branche `main`.
3. Dans GitHub, ouvrez **Settings → Pages** et choisissez **GitHub Actions** comme source.
4. Le workflow `deploy.yml` se lance à chaque push sur `main`, après réussite de `npm test`.

URL attendue : <https://agesilas3118.github.io/repohealth/>.

Pour relancer le déploiement manuellement : **Actions → Deploy to GitHub Pages → Run workflow**. Vérifiez ensuite l'exécution dans **Actions**, puis ouvrez l'URL publiée.

---

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE).
