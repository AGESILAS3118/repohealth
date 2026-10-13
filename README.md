# RepoHealth v1.0

[![CI](https://github.com/AGESILAS3118/repohealth/actions/workflows/ci.yml/badge.svg)](https://github.com/AGESILAS3118/repohealth/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A free, 100% in-browser web tool hosted on GitHub Pages that assesses public GitHub repository health, scoring them from 0 to 100 with a grade (A+ to F), in English and French, without installation or CLI.

📖 *[Lire la version française (README.fr.md)](README.fr.md)*  
📑 *[Scoring Methodology Documentation (docs/scoring.md)](docs/scoring.md)*
📝 *[Changelog (CHANGELOG.md)](CHANGELOG.md)*

---

## 🚀 Features

- **Pure Vanilla Web**: HTML5, Modern CSS, and ES Modules. No build steps, no external runtime dependencies, no frameworks.
- **Scoring Engine (0 to 100 & A+ to F)**: Deterministic, extensible multi-pillar scoring engine based on transparent community benchmarks.
- **Documentation Pillar (20% Weight)**: In-depth evaluation across 9 specific checks (README presence, size, headings, code blocks, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SUPPORT, CHANGELOG).
- **Prioritized Recommendations**: Instant action plan listing missed points and priority tags (`high`, `medium`, `low`).
- **GitHub REST API Client**: Built-in client targeting GitHub API v3 (`2022-11-28`) with strict headers.
- **Smart Local Storage Cache**: Automatic 15-minute TTL caching prevents redundant API calls and conserves quota; cached reports are labeled and can be refreshed on demand.
- **Active Rate Limit Handling**: Parses `X-RateLimit-*` headers, remembers remaining calls in `localStorage`, and displays exact reset times.
- **Targeted API Orchestration**: Runs the core repository checks plus `package.json`; when needed, it inspects test files to recognize native Node.js testing, while keeping optional endpoint failures non-blocking.
- **Privacy & Security First**: Strict Content Security Policy (CSP), zero telemetry, no third-party network requests, no cookies.
- **Bilingual (EN / FR)**: Automatic browser language detection with persistent user toggle saved in `localStorage`.
- **System Theme Adaptive**: Light and dark mode support aligned with system preferences and locally remembered.
- **PWA Ready**: Offline-capable baseline with `manifest.webmanifest` and a lightweight Service Worker (`sw.js`).
- **JSON Report Export**: Download a versioned, structured copy of the report for archiving or further processing.
- **Native Node Testing**: Comprehensive test suite using Node.js built-in `node:test` runner.

---

## 📁 Repository Structure

```text
repohealth/
├─ .github/workflows/
│  ├─ ci.yml                # Automated test workflow
│  └─ deploy.yml            # GitHub Pages deployment workflow
├─ .nojekyll                # Disables Jekyll processing on GitHub Pages
├─ docs/
│  └─ scoring.md            # Bilingual scoring methodology & rules documentation
├─ icons/
│  ├─ icon-192.png          # PWA square icon (192x192)
│  ├─ icon-512.png          # PWA square and maskable icon (512x512)
│  └─ icon.svg              # Vector icon source
├─ index.html               # Semantic HTML5 entrypoint with strict CSP
├─ manifest.webmanifest     # Progressive Web App manifest
├─ screenshots/
│  ├─ desktop.png           # Desktop install screenshot (1280x720)
│  ├─ desktop.svg           # Desktop screenshot source
│  ├─ mobile.png            # Mobile install screenshot (750x1334)
│  └─ mobile.svg            # Mobile screenshot source
├─ sw.js                    # Minimal offline Service Worker
├─ package.json             # ES Module configuration & test script
├─ .gitignore               # Standard Git ignore list
├─ LICENSE                  # MIT License
├─ PRD_RepoHealth.md        # Product requirements document
├─ README.md                # English documentation
├─ README.fr.md             # French documentation
├─ src/
│  ├─ main.js               # Main application coordinator (i18n, DOM, scoring UI)
│  ├─ api/
│  │  ├─ github.js          # REST v3 API client (mandatory headers, safe errors)
│  │  ├─ cache.js           # LocalStorage wrapper with 15-minute TTL and auto cleanup
│  │  ├─ rateLimit.js       # X-RateLimit header parser & status tracker
│  │  └─ analyze.js         # Diagnostic orchestrator and test-runner detection
│  ├─ scoring/
│  │  ├─ engine.js          # Orchestrates weighted pillars and computes overall score
│  │  ├─ grades.js          # Score to letter grade conversion (A+ to F)
│  │  ├─ types.js           # JSDoc type definitions (ScoreReport, PillarResult)
│  │  ├─ version.js         # Central scoring engine version
│  │  └─ pillars/
│  │     ├─ activity.js     # Activity and maintenance scoring
│  │     ├─ cicd.js         # CI/CD and automation scoring
│  │     ├─ codeQuality.js  # Code quality scoring
│  │     ├─ community.js    # Community scoring
│  │     ├─ documentation.js# Documentation scoring
│  │     ├─ hygiene.js      # Repository hygiene scoring
│  │     └─ security.js     # Security scoring
│  ├─ badge/
│  │  └─ generate.js        # Client-side SVG badge generation
│  ├─ export/
│  │  └─ json.js            # Versioned JSON report serialization
│  ├─ i18n/
│  │  ├─ fr.json            # French translation dictionary
│  │  └─ en.json            # English translation dictionary
│  └─ utils/
│     └─ url.js             # Repository parser & validator (owner/repo or URL)
└─ tests/
   ├─ activity.test.js      # Activity pillar tests
   ├─ analyze.test.js       # Analysis orchestration tests
   ├─ badge.test.js         # SVG badge generator tests
   ├─ cache.test.js         # Local cache and TTL tests
   ├─ cicd.test.js          # CI/CD pillar tests
   ├─ codeQuality.test.js   # Code quality pillar tests
   ├─ community.test.js     # Community pillar tests
   ├─ documentation.test.js # Documentation pillar tests
   ├─ engine.test.js        # Score report and weighted aggregation tests
   ├─ export.test.js        # JSON export payload tests
   ├─ github.test.js        # GitHub API client tests
   ├─ grades.test.js        # Grade threshold tests
   ├─ hygiene.test.js       # Repository hygiene pillar tests
   ├─ i18n.test.js          # Translation parity tests
   ├─ mainUi.test.js        # UI rendering and URL parameter tests
   ├─ manifest.test.js      # PWA manifest assets and dimension tests
   ├─ rateLimit.test.js     # Rate limit handling tests
   ├─ security.test.js      # Security pillar tests
   └─ url.test.js           # GitHub repository input parser tests
```

---

## 🛠️ Getting Started Locally

Because ES Modules and Service Workers require HTTP(S) serving (they will not execute over `file://`):

### 1. Run local HTTP server
Using Python 3:
```bash
python3 -m http.server 8080
```
Or using Node.js `npx`:
```bash
npx serve .
```

### 2. Open in your browser
Navigate to:
```text
http://localhost:8080
```

---

## 🧪 Running Tests

RepoHealth utilizes Node.js's native test runner (zero `npm install` needed):

```bash
npm test
```

The suite currently contains 130 tests across 18 test files.

## 🚀 Deployment

Prerequisites: a public GitHub repository and a `main` branch.

1. Create the public repository [AGESILAS3118/repohealth](https://github.com/AGESILAS3118/repohealth).
2. Push the project to `main`.
3. In GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. The `deploy.yml` workflow runs automatically on each push to `main` after `npm test` passes.

Expected URL: <https://agesilas3118.github.io/repohealth/>.

To redeploy manually, open **Actions → Deploy to GitHub Pages → Run workflow**. Check the workflow run in **Actions**, then open the published URL.

---

## 🤝 Contributing

Contributions are welcome. Please read the [contribution guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request. To report a security issue, follow [SECURITY.md](SECURITY.md).

## 🆘 Support

See [SUPPORT.md](SUPPORT.md) for help, bug reports, feature requests, and documentation links. You can also use the [Bug Report](https://github.com/AGESILAS3118/repohealth/issues/new?template=bug_report.md) and [Feature Request](https://github.com/AGESILAS3118/repohealth/issues/new?template=feature_request.md) issue templates.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
