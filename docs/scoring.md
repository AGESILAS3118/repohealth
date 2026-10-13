# Méthodologie de Scoring — RepoHealth / Scoring Methodology

---

## Section Française : Méthodologie et Règles de Calcul

### 1. Vue d'ensemble du Moteur de Scoring
RepoHealth évalue la santé globale d'un dépôt GitHub public à partir des données en lecture seule collectées via l'API GitHub REST v3.
Le score global est normalisé sur une échelle de **0 à 100**, puis converti en un **grade qualitatif** de **A+ à F**.

- **Version actuelle du moteur :** `1.0.0`
- **Exécution :** 100 % dans le navigateur de l'utilisateur, aucune transmission de données à un serveur tiers.

---

### 2. Architecture en 7 Piliers

L'évaluation complète de RepoHealth est structurée autour de **sept piliers thématiques pondérés** :

| # | Pilier | Poids | Description et éléments cibles |
|---:|---|:---:|---|
| 1 | **Documentation** | **20 %** | README, licence, guides de contribution, support, changelog, structure de documentation. |
| 2 | **CI/CD et Automatisation** | **15 %** | Workflows GitHub Actions, tests, lint, release, Dependabot et Renovate. |
| 3 | **Sécurité** | **20 %** | `SECURITY.md`, absence de secrets, licence, dépôt actif et section sécurité documentée. |
| 4 | **Activité et Maintenance** | **15 %** | Récence des commits, publication de releases, ratio de clôture des issues et maintenance active. |
| 5 | **Communauté** | **10 %** | Nombre de contributeurs, bus factor, templates d'issues/PR, temps de réponse et contributions externes. |
| 6 | **Qualité du code** | **10 %** | Tests, couverture, lint, formatter, structure de projet et typage. |
| 7 | **Hygiène du dépôt** | **10 %** | `.gitignore`, description, topics, taille, absence de binaires lourds, homepage et statut fork. |

> Le moteur applique la moyenne pondérée des sept piliers enregistrés. Le score global reste borné entre 0 et 100, même en présence de données partielles ou nulles.

---

### 3. Détail du Pilier 1 : Documentation

Le pilier Documentation compte un total de **100 points internes** répartis sur 9 contrôles déterministes :

| # | Contrôle | Points | Conditions de validation |
|---:|---|:---:|---|
| 1 | **README présent** | 15 | Un fichier README est retourné par l'endpoint `/readme`. |
| 2 | **README substantiel** | 15 | Le contenu textuel décodé du README dépasse **800 caractères**. |
| 3 | **README structuré** | 10 | Présence d'au moins **2 titres Markdown** (`#` ou `##`). |
| 4 | **Exemples de code** | 10 | Présence d'au moins un bloc de code Markdown (\`\`\`). |
| 5 | **Fichier LICENSE** | 15 | Présence d'un fichier `LICENSE`, `LICENSE.md`, `LICENSE.txt` ou `COPYING` à la racine. |
| 6 | **Guide CONTRIBUTING** | 10 | Présence de `CONTRIBUTING.md` à la racine ou dans le dossier `.github/`. |
| 7 | **Code de conduite** | 10 | Présence de `CODE_OF_CONDUCT.md` à la racine ou dans `.github/`. |
| 8 | **Assistance SUPPORT** | 5 | Présence de `SUPPORT.md` à la racine ou dans `.github/`. |
| 9 | **Journal CHANGELOG** | 10 | Présence de `CHANGELOG.md`, `CHANGELOG`, `HISTORY.md` à la racine ou dans `.github/`. |

#### Système de Recommandations
Chaque contrôle échoué génère automatiquement une recommandation concrète, dotée d'une priorité :
- **Priorité Haute (High)** : perte de 15 points ou plus.
- **Priorité Moyenne (Medium)** : perte de 10 points.
- **Priorité Basse (Low)** : perte de 5 points.

Les recommandations sont affichées par ordre d'impact décroissant sur le score.

---

### 4. Grille de Notation (Grades)

| Plage de Score | Grade | Interprétation |
|:---:|:---:|---|
| **90 – 100** | **A+** | Exemplaire : standards communautaires et documentation complets. |
| **80 – 89.9** | **A** | Très bon : solide base de documentation, améliorations mineures possibles. |
| **70 – 79.9** | **B** | Bon : documentation fonctionnelle, quelques guides manquants. |
| **60 – 69.9** | **C** | Passable : informations essentielles présentes, mais structure lacunaire. |
| **50 – 59.9** | **D** | Insuffisant : documentation minimale ou README incomplet. |
| **< 50** | **F** | Critique : absence de fichiers fondamentaux (README, LICENSE, etc.). |

---

<br/>

---

## English Section: Scoring Methodology

### 1. Scoring Engine Overview
RepoHealth assesses the health of any public GitHub repository using read-only data gathered via GitHub REST API v3.
The overall score is normalized from **0 to 100**, and mapped to a **qualitative letter grade** from **A+ to F**.

- **Current Engine Version:** `1.0.0`
- **Execution:** 100% in-browser, zero data transmitted to proprietary servers.

---

### 2. Seven Weighted Pillars Architecture

RepoHealth's comprehensive assessment is structured around **seven weighted pillars**:

| # | Pillar | Weight | Target Elements |
|---:|---|:---:|---|
| 1 | **Documentation** | **20%** | README, license, contribution guides, support information, changelog, and document structure. |
| 2 | **CI/CD & Automation** | **15%** | GitHub Actions workflows, tests, linting, release automation, Dependabot, and Renovate. |
| 3 | **Security** | **20%** | `SECURITY.md`, secret exposure checks, license, archive status, and README security guidance. |
| 4 | **Activity & Maintenance** | **15%** | Commit recency, issue closure dynamics, release freshness, and maintenance activity. |
| 5 | **Community** | **10%** | Contributor count, bus factor, issue/PR templates, response time, and external issue resolution. |
| 6 | **Code Quality** | **10%** | Tests, coverage, linting, formatting, project structure, and typing. |
| 7 | **Repository Hygiene** | **10%** | `.gitignore`, repository description, topics, size, binary artifacts, homepage, and fork status. |

> The engine applies the weighted average of all seven registered pillars. The global score remains bounded between 0 and 100 even when some data points are partial or null.

---

### 3. Pillar 1: Documentation Breakdown

The Documentation pillar allocates a total of **100 internal points** across 9 deterministic checks:

| # | Check | Points | Pass Conditions |
|---:|---|:---:|---|
| 1 | **README Present** | 15 | A README file is detected by the `/readme` endpoint. |
| 2 | **Substantial README** | 15 | Decoded README character length exceeds **800 characters**. |
| 3 | **Structured README** | 10 | Contains at least **2 Markdown headings** (`#` or `##`). |
| 4 | **Code Examples** | 10 | Contains at least one code snippet fence (\`\`\`). |
| 5 | **LICENSE File** | 15 | `LICENSE`, `LICENSE.md`, `LICENSE.txt`, or `COPYING` found at repository root. |
| 6 | **CONTRIBUTING Guide** | 10 | `CONTRIBUTING.md` found at root or within `.github/`. |
| 7 | **CODE_OF_CONDUCT** | 10 | `CODE_OF_CONDUCT.md` found at root or within `.github/`. |
| 8 | **SUPPORT Information** | 5 | `SUPPORT.md` found at root or within `.github/`. |
| 9 | **CHANGELOG History** | 10 | `CHANGELOG.md`, `CHANGELOG`, or `HISTORY.md` found at root or within `.github/`. |

#### Recommendation Priority Model
Failed checks automatically emit actionable recommendations prioritized by score gain:
- **High Priority**: 15+ points gain.
- **Medium Priority**: 10 points gain.
- **Low Priority**: 5 points gain.

Recommendations are displayed in descending order of impact.

---

### 4. Grading Scale

| Score Range | Grade | Description |
|:---:|:---:|---|
| **90 – 100** | **A+** | Exemplary documentation adhering to top open source standards. |
| **80 – 89.9** | **A** | Very good: solid documentation with only minor omissions. |
| **70 – 79.9** | **B** | Good: functional documentation, missing optional guides. |
| **60 – 69.9** | **C** | Fair: essential info present but missing deeper structure. |
| **50 – 59.9** | **D** | Poor: minimal content or undersized README. |
| **< 50** | **F** | Critical: missing core artifacts (README, LICENSE, etc.). |
