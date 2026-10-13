/**
 * RepoHealth - Point d'entrée JavaScript (Modules ES)
 * Gère l'internationalisation, la détection & mémorisation de la langue,
 * le thème clair/sombre, l'analyse GitHub API et le moteur de scoring.
 */
import { parseRepoInput } from './utils/url.js';
import { runAnalysis } from './api/analyze.js';
import { computeScoreReport } from './scoring/engine.js';
import { ENGINE_VERSION } from './scoring/version.js';
import { generateBadgeSvg } from './badge/generate.js';
import { buildExportPayload } from './export/json.js';

// Cache mémoire des dictionnaires de langue
const i18nCache = {};
let currentLang = 'fr';
const PILLAR_ICONS = {
  documentation: '📄',
  cicd: '⚙️',
  security: '🔒',
  activity: '🕒',
  community: '👥',
  codeQuality: '✅',
  hygiene: '🧹'
};

function formatDisplayedScore(score) {
  return Number(score).toFixed(1);
}

/**
 * Charge un dictionnaire de traduction pour une langue donnée.
 * @param {string} lang - 'fr' ou 'en'
 * @returns {Promise<object>} Dictionnaire JSON
 */
async function loadTranslations(lang) {
  if (i18nCache[lang]) {
    return i18nCache[lang];
  }
  try {
    const response = await fetch(`./src/i18n/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();
    i18nCache[lang] = data;
    return data;
  } catch (err) {
    console.error(`Impossible de charger les traductions pour ${lang}:`, err);
    return i18nCache['en'] || i18nCache['fr'] || {};
  }
}

/**
 * Récupère une valeur imbriquée dans un objet via une clé avec notation pointée.
 * @param {object} obj 
 * @param {string} path 
 * @returns {string|undefined}
 */
function getNestedTranslation(obj, path) {
  return path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
}

/**
 * Récupère une traduction pour la langue active.
 * @param {string} key 
 * @returns {string}
 */
function t(key) {
  const dict = i18nCache[currentLang] || {};
  return getNestedTranslation(dict, key) || key;
}

/**
 * Détecte la langue préférée de l'utilisateur (localStorage ou navigator.language).
 * @returns {string} 'fr' ou 'en'
 */
function detectInitialLanguage() {
  const stored = localStorage.getItem('repohealth_lang');
  if (stored === 'fr' || stored === 'en') {
    return stored;
  }
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return browserLang.startsWith('fr') ? 'fr' : 'en';
}

/**
 * Applique les traductions à l'ensemble du DOM.
 * @param {string} lang - Langue à appliquer ('fr' ou 'en')
 */
async function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('repohealth_lang', lang);
  document.documentElement.lang = lang;

  const dict = await loadTranslations(lang);

  // Mise à jour de tous les éléments avec data-i18n
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const text = getNestedTranslation(dict, key);
    if (text) {
      el.textContent = text;
    }
  });

  // Mise à jour des placeholders avec data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = getNestedTranslation(dict, key);
    if (text) {
      el.setAttribute('placeholder', text);
    }
  });

  // Mise à jour des aria-label avec data-i18n-aria-label
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    const text = getNestedTranslation(dict, key);
    if (text) {
      el.setAttribute('aria-label', text);
    }
  });

  // Mise à jour de l'état actif des boutons de langue
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    const btnLang = btn.getAttribute('data-lang');
    const isActive = btnLang === lang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  // Si une erreur est affichée, réactualiser son libellé
  const errorContainer = document.getElementById('error-message');
  if (errorContainer && errorContainer.getAttribute('data-error-key')) {
    const errorKey = errorContainer.getAttribute('data-error-key');
    const errorText = t(errorKey);
    const extraReset = errorContainer.getAttribute('data-reset-time');
    if (extraReset) {
      errorContainer.innerHTML = `${escapeHtml(errorText)} <span class="reset-time">${escapeHtml(t('rate_limit_reset'))} ${escapeHtml(extraReset)}</span>`;
    } else {
      errorContainer.textContent = errorText;
    }
  }

  // Si un résultat de diagnostic est affiché, le réafficher avec la nouvelle langue
  if (window.__lastAnalysisResult && window.__lastScoreReport) {
    renderScoreReport(window.__lastAnalysisResult, window.__lastScoreReport);
  }

  // Mettre à jour le titre du document
  if (dict.appTitle && dict.appTagline) {
    document.title = `${dict.appTitle} — ${dict.appTagline}`;
  }
}

/**
 * Initialise le thème clair/sombre avec respect du réglage système et mémorisation.
 */
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const storedTheme = localStorage.getItem('repohealth_theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const currentTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('repohealth_theme', newTheme);
    });
  }

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('repohealth_theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  }
}

/**
 * Enregistre le Service Worker en mode sécurisé.
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[SW] Service Worker enregistré avec succès:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] Échec enregistrement Service Worker:', err);
      });
  }
}

/**
 * Affiche un message d'erreur et met à jour l'accessibilité.
 * @param {string} key - Clé d'erreur i18n
 * @param {object} [options]
 * @param {number} [options.resetAt] - Timestamp de réinitialisation pour le rate limit
 */
function showError(key, options = {}) {
  const errorContainer = document.getElementById('error-message');
  const input = document.getElementById('repo-input');
  if (!errorContainer) return;

  const message = t(key);
  errorContainer.setAttribute('data-error-key', key);

  if (options.resetAt) {
    const date = new Date(options.resetAt);
    const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    errorContainer.setAttribute('data-reset-time', timeFormatted);
    errorContainer.innerHTML = `${escapeHtml(message)} <div class="reset-time-badge">${escapeHtml(t('rate_limit_reset'))} <strong>${escapeHtml(timeFormatted)}</strong></div>`;
  } else {
    errorContainer.removeAttribute('data-reset-time');
    errorContainer.textContent = message;
  }

  errorContainer.hidden = false;

  if (input) {
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }
}

/**
 * Efface le message d'erreur.
 */
function clearError() {
  const errorContainer = document.getElementById('error-message');
  const input = document.getElementById('repo-input');
  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.hidden = true;
    errorContainer.removeAttribute('data-error-key');
    errorContainer.removeAttribute('data-reset-time');
  }
  if (input) {
    input.removeAttribute('aria-invalid');
  }
}

/**
 * Affiche l'état de chargement lors de l'analyse API.
 */
function setLoadingState(isLoading) {
  const submitBtn = document.getElementById('submit-btn');
  const input = document.getElementById('repo-input');
  const resultsContainer = document.getElementById('results-section');

  if (submitBtn) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? t('form.analyzingBtn') : t('form.submitBtn');
  }

  if (input) {
    input.disabled = isLoading;
  }

  if (isLoading && resultsContainer) {
    resultsContainer.hidden = false;
    resultsContainer.innerHTML = `
      <div class="loading-box" role="status">
        <div class="spinner" aria-hidden="true"></div>
        <p class="loading-text">${escapeHtml(t('loading'))}</p>
      </div>
    `;
  }
}

/**
 * Détermine la classe de couleur de score : vert (>=80), orange (50-79), rouge (<50).
 * @param {number} score 
 * @returns {'score-good' | 'score-medium' | 'score-poor'}
 */
function getScoreColorClass(score) {
  if (score >= 80) return 'score-good';
  if (score >= 50) return 'score-medium';
  return 'score-poor';
}

/**
 * Affiche le rapport visuel complet avec score global, grade, piliers et recommandations.
 * @param {object} analysis - Données issues de runAnalysis
 * @param {import('./scoring/types.js').ScoreReport} report - Rapport de scoring calculé
 */
export function renderScoreReport(analysis, report) {
  const resultsContainer = document.getElementById('results-section');
  if (!resultsContainer) return;

  window.__lastAnalysisResult = analysis;
  window.__lastScoreReport = report;

  const repo = analysis.repo || {};
  const owner = repo.owner?.login || '';
  const repoName = repo.name || '';
  const stars = typeof repo.stargazers_count === 'number' ? repo.stargazers_count.toLocaleString() : '—';
  const language = repo.language || 'Non spécifié';

  // Formatage du dernier commit
  let lastCommitText = '—';
  if (analysis.commits && analysis.commits.length > 0) {
    const commitDateStr = analysis.commits[0].commit?.committer?.date || analysis.commits[0].commit?.author?.date;
    if (commitDateStr) {
      const commitDate = new Date(commitDateStr);
      lastCommitText = commitDate.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  const analysisTimestamp = report.computedAt || analysis.fetchedAt;
  const analysisDate = analysisTimestamp
    ? new Date(analysisTimestamp).toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '—';
  const fetchedAtDate = analysis.fetchedAt ? new Date(analysis.fetchedAt).toLocaleTimeString() : '';

  const pillars = Array.isArray(report.pillars) ? report.pillars : [];
  const hasGlobalScore = Number.isFinite(report.score);
  const globalColorClass = hasGlobalScore ? getScoreColorClass(report.score) : 'score-unavailable';
  const totalMethodologyWeight = pillars.reduce((sum, pillar) => sum + (Number(pillar?.weight) || 0), 0);

  const allRecommendations = pillars.flatMap((pillar) => (pillar && Array.isArray(pillar.recommendations) ? pillar.recommendations : []));
  allRecommendations.sort((a, b) => (b.points || 0) - (a.points || 0));

  const recommendationsHtml = allRecommendations.length > 0
    ? allRecommendations.map((rec) => {
        const priorityLabel = t(`report_priority_${rec.priority}`);
        return `
          <li class="rec-item priority-${rec.priority}">
            <div class="rec-header">
              <span class="rec-badge priority-${rec.priority}">${escapeHtml(priorityLabel)}</span>
              <span class="rec-points">+${escapeHtml(rec.points)} ${escapeHtml(t('report_recommendation_points'))}</span>
            </div>
            <p class="rec-text">${escapeHtml(t(rec.labelKey))}</p>
          </li>
        `;
      }).join('')
    : report.score === null
      ? `<li class="rec-item"><p role="status">${escapeHtml(t('report_analysis_unavailable'))}</p></li>`
      : `<li class="rec-item rec-empty"><p>🎉 ${escapeHtml(t('report_no_recommendations'))}</p></li>`;

  const pillarCardsHtml = pillars.map((pillar) => {
    const hasPillarScore = Number.isFinite(pillar.score);
    const pillarScore = hasPillarScore ? pillar.score : null;
    const pillarColorClass = hasPillarScore ? getScoreColorClass(pillarScore) : 'score-unavailable';
    const pillarStatusLabel = pillar.status === 'not_verifiable'
      ? t('report_not_verifiable')
      : t('report_insufficient_data');
    const icon = PILLAR_ICONS[pillar.id] || '📊';
    return `
      <div class="pillar-section">
        <div class="pillar-header">
          <div class="pillar-title-group">
            <span class="pillar-icon">${icon}</span>
            <h3 class="pillar-title">${escapeHtml(t(pillar.labelKey))}</h3>
            <span class="pillar-weight">(${pillar.weight}% pondération)</span>
          </div>
          ${hasPillarScore
            ? `<span class="pillar-score ${pillarColorClass}">${escapeHtml(formatDisplayedScore(pillarScore))} / 100</span>`
            : `<span class="pillar-score score-unavailable" role="status" aria-live="polite">${escapeHtml(pillarStatusLabel)}</span>`}
        </div>
        ${hasPillarScore
          ? `<div class="progress-bar-container" role="progressbar" aria-valuenow="${escapeHtml(formatDisplayedScore(pillarScore))}" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-bar-fill ${pillarColorClass}" style="width: ${pillarScore}%;"></div>
            </div>`
          : ''}
      </div>
    `;
  }).join('');

  const methodologyPillarsText = pillars.map((pillar) => `${escapeHtml(t(pillar.labelKey))} (${pillar.weight}%)`).join(' • ');
  const globalScoreDisplay = hasGlobalScore
    ? `<span class="score-value">${escapeHtml(formatDisplayedScore(report.score))}</span><span class="score-max">/100</span>`
    : `<span class="score-value score-unavailable">—</span>
       <span class="score-unavailable-message" role="status" aria-live="polite">${escapeHtml(t('report_analysis_unavailable'))}</span>`;
  const gradeDisplay = report.grade === null
    ? '—'
    : escapeHtml(report.grade);
  const badgeData = hasGlobalScore
    ? generateBadgeSvg({
        score: report.score,
        grade: report.grade,
        repo: `${owner}/${repoName}`,
        locale: currentLang
      })
    : null;
  const appUrl = window.location.origin + window.location.pathname;
  const reportUrl = new URL(appUrl);
  reportUrl.searchParams.set('repo', `${owner}/${repoName}`);
  const reportLink = reportUrl.toString();
  const dataUriMarkdown = badgeData
    ? `[![RepoHealth](${badgeData.dataUri})](${reportLink})`
    : '';
  const uploadedSvgMarkdown = `[![RepoHealth](./repohealth-badge.svg)](${reportLink})`;

  resultsContainer.innerHTML = `
    <div class="result-card">
      <div class="result-header">
        <span class="status-badge">RepoHealth v1.0</span>
        <h2 class="repo-title">
          <span class="owner">${escapeHtml(owner)}</span> /
          <span class="repo">${escapeHtml(repoName)}</span>
        </h2>
      </div>

      <div class="summary-grid">
        <div class="summary-metric">
          <span class="metric-label">${escapeHtml(t('result_stars'))}</span>
          <span class="metric-value">⭐ ${escapeHtml(stars)}</span>
        </div>
        <div class="summary-metric">
          <span class="metric-label">${escapeHtml(t('result_language'))}</span>
          <span class="metric-value">💻 ${escapeHtml(language)}</span>
        </div>
        <div class="summary-metric">
          <span class="metric-label">${escapeHtml(t('result_last_commit'))}</span>
          <span class="metric-value">🕒 ${escapeHtml(lastCommitText)}</span>
        </div>
      </div>

      <div class="score-overview-card ${globalColorClass}">
        <div class="score-display">
          <span class="score-label">${escapeHtml(t('report_score_label'))}</span>
          <div class="score-number-wrap">
            ${globalScoreDisplay}
          </div>
        </div>
        <div class="grade-display">
          <span class="grade-label">${escapeHtml(t('report_grade_label'))}</span>
          <span class="grade-badge ${globalColorClass}">${gradeDisplay}</span>
        </div>
      </div>

      ${pillarCardsHtml}

      <div class="recommendations-container">
        <h3 class="recommendations-title">${escapeHtml(t('report_recommendations_title'))}</h3>
        <ul class="recommendations-list">
          ${recommendationsHtml}
        </ul>
      </div>

      <details class="methodology-card">
        <summary class="methodology-summary">
          <span>📖 ${escapeHtml(t('report_methodology_title'))}</span>
        </summary>
        <div class="methodology-body">
          <p><strong>${escapeHtml(t('report_methodology_version'))} :</strong> v${escapeHtml(ENGINE_VERSION)}</p>
          <p><strong>${escapeHtml(t('report_methodology_weight'))} :</strong> ${methodologyPillarsText}</p>
          <p><strong>${escapeHtml(t('report_methodology_weight'))} :</strong> ${escapeHtml(totalMethodologyWeight)}% total</p>
        </div>
      </details>

      <div class="result-next-step">
        <div class="meta-footer">
          <span class="meta-time">${escapeHtml(t('result_fetched_at'))} ${escapeHtml(fetchedAtDate)}</span>
          <a href="https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}"
             target="_blank"
             rel="noopener noreferrer"
             class="btn-secondary">
             Voir sur GitHub ↗
          </a>
        </div>
      </div>

      <aside class="security-warning" role="note" aria-label="${escapeHtml(t('report_security_warning_label'))}">
        <p>${escapeHtml(t('report_security_warning'))}</p>
        <p class="security-warning-meta">
          ${escapeHtml(t('report_engine_version'))} v${escapeHtml(ENGINE_VERSION)}
          <span aria-hidden="true">·</span>
          ${escapeHtml(t('report_analysis_date'))} ${escapeHtml(analysisDate)}
        </p>
      </aside>

      ${badgeData ? `
        <section class="badge-share" aria-labelledby="badge-share-title">
          <h3 id="badge-share-title">${escapeHtml(t('report.badge.title'))}</h3>
          <img class="badge-preview" src="${escapeHtml(badgeData.dataUri)}" width="200" height="28" alt="${escapeHtml(t('report.badge.preview_alt'))}">
          <p class="badge-instructions">${escapeHtml(t('report.badge.instructions'))}</p>
          <div class="badge-actions">
            <button type="button" class="btn-secondary" data-badge-download>${escapeHtml(t('report.badge.download'))}</button>
            <button type="button" class="btn-secondary" data-badge-copy="data">${escapeHtml(t('report.badge.copy_markdown'))}</button>
            <button type="button" class="btn-secondary" data-badge-copy="uploaded">${escapeHtml(t('report.badge.copy_uploaded'))}</button>
          </div>
          <label class="badge-snippet-label" for="badge-markdown-data">${escapeHtml(t('report.badge.data_snippet'))}</label>
          <textarea id="badge-markdown-data" class="badge-markdown" rows="3" readonly>${escapeHtml(dataUriMarkdown)}</textarea>
          <label class="badge-snippet-label" for="badge-markdown-uploaded">${escapeHtml(t('report.badge.uploaded_snippet'))}</label>
          <textarea id="badge-markdown-uploaded" class="badge-markdown" rows="2" readonly>${escapeHtml(uploadedSvgMarkdown)}</textarea>
          <span class="badge-copy-status" role="status" aria-live="polite"></span>
        </section>
        <section class="report-export" aria-labelledby="report-export-title">
          <h3 id="report-export-title">${escapeHtml(t('report.export.title'))}</h3>
          <p>${escapeHtml(t('report.export.description'))}</p>
          <button type="button" class="btn-secondary" data-report-export>${escapeHtml(t('report.export.download'))}</button>
          <span class="report-export-status" role="status" aria-live="polite"></span>
        </section>
      ` : ''}
    </div>
  `;
  resultsContainer.hidden = false;

  if (badgeData) {
    wireBadgeActions(badgeData.svg);
    wireReportExport(report, {
      owner,
      name: repoName,
      url: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`,
      analyzedAt: analysisTimestamp,
      pillarNames: Object.fromEntries(pillars.flatMap((pillar) => [
        [pillar.id, t(pillar.labelKey)],
        [pillar.labelKey, t(pillar.labelKey)]
      ]))
    });
  }
}

/**
 * Connects the JSON report export button to a downloadable file.
 * @param {import('./scoring/types.js').ScoreReport} report
 * @param {Parameters<typeof buildExportPayload>[1]} meta
 */
function wireReportExport(report, meta) {
  const button = document.querySelector('[data-report-export]');
  const status = document.querySelector('.report-export-status');
  button?.addEventListener('click', () => {
    try {
      const { json, filename } = buildExportPayload(report, meta);
      const objectUrl = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      if (status) status.textContent = t('report.export.downloaded');
    } catch (error) {
      console.error('Échec de l’export JSON du rapport:', error);
      if (status) status.textContent = t('report.export.error');
    }
  });
}

/**
 * Connects the report badge download and Markdown copy actions.
 * @param {string} svg
 */
function wireBadgeActions(svg) {
  const downloadButton = document.querySelector('[data-badge-download]');
  const copyButtons = document.querySelectorAll('[data-badge-copy]');
  const status = document.querySelector('.badge-copy-status');

  downloadButton?.addEventListener('click', () => {
    const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'repohealth-badge.svg';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  });

  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const snippetId = button.getAttribute('data-badge-copy') === 'uploaded'
        ? 'badge-markdown-uploaded'
        : 'badge-markdown-data';
      const snippet = document.getElementById(snippetId);
      if (!snippet) return;

      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(snippet.value);
          copied = true;
        } catch {
          copied = copyWithTextareaFallback(snippet.value);
        }
      } else {
        copied = copyWithTextareaFallback(snippet.value);
      }
      if (status) {
        status.textContent = t(copied ? 'report.badge.copied' : 'report.badge.copy_failed');
      }
    });
  });
}

function copyWithTextareaFallback(value) {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
}

/**
 * Applies and consumes a `?repo=` query parameter after the form handlers exist.
 * @param {{search: string, input: HTMLInputElement, requestSubmit: () => void, onInvalid: () => void, replaceUrl: (url: string) => void}} options
 * @returns {boolean} Whether the URL contained a repo parameter.
 */
export function initializeRepoQuery({ search, input, requestSubmit, onInvalid, replaceUrl }) {
  const params = new URLSearchParams(search);
  const value = params.get('repo');
  if (value === null) return false;

  const parsed = parseRepoInput(value);
  if (parsed) {
    input.value = `${parsed.owner}/${parsed.repo}`;
    requestSubmit();
  } else {
    onInvalid();
  }

  params.delete('repo');
  const remainingQuery = params.toString();
  replaceUrl(`${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`);
  return true;
}

/**
 * Échappe le HTML pour éviter tout problème d'injection.
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Initialisation principale de l'application.
 */
async function initApp() {
  initTheme();
  registerServiceWorker();

  // Initialisation i18n
  const initialLang = detectInitialLanguage();
  await setLanguage(initialLang);

  // Configuration des écouteurs du commutateur de langue
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const selectedLang = e.currentTarget.getAttribute('data-lang');
      if (selectedLang && selectedLang !== currentLang) {
        setLanguage(selectedLang);
      }
    });
  });

  // Gestion du formulaire
  const form = document.getElementById('repo-form');
  const input = document.getElementById('repo-input');

  if (form && input) {
    // Effacer l'erreur lors de la saisie
    input.addEventListener('input', () => {
      clearError();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      const rawVal = input.value;
      if (!rawVal || !rawVal.trim()) {
        showError('errors.emptyInput');
        return;
      }

      const parsed = parseRepoInput(rawVal);
      if (!parsed) {
        showError('errors.invalidFormat');
        return;
      }

      // Début de l'analyse avec le client GitHub API
      setLoadingState(true);

      try {
        const result = await runAnalysis(parsed.owner, parsed.repo);

        setLoadingState(false);

        if (!result.ok) {
          if (result.error === 'rate_limit') {
            showError('error_rate_limit', { resetAt: result.resetAt });
          } else if (result.error === 'not_found') {
            showError('error_not_found');
          } else if (result.error === 'network') {
            showError('error_network');
          } else if (result.error === 'forbidden') {
            showError('error_forbidden');
          } else {
            showError(`errors.invalidFormat`);
          }
          return;
        }

        // Calcul du rapport de scoring sans requête réseau supplémentaire
        const scoreReport = computeScoreReport(result.data);

        // Affichage du rapport visuel
        renderScoreReport(result.data, scoreReport);
      } catch (err) {
        setLoadingState(false);
        console.error('Erreur inattendue analyse:', err);
        showError('error_network');
      }
    });

    initializeRepoQuery({
      search: window.location.search,
      input,
      requestSubmit: () => form.requestSubmit(),
      onInvalid: () => showError('errors.invalidFormat'),
      replaceUrl: (url) => window.history.replaceState({}, '', url)
    });
  }
}

// Lancement au chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
