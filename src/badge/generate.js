const GRADE_COLORS = {
  'A+': '#2ea043',
  A: '#2ea043',
  B: '#3fb950',
  C: '#d29922',
  D: '#db6d28',
  F: '#da3633'
};

let fallbackId = 0;

function createBadgeId() {
  const cryptoApi = globalThis.crypto;
  const uniquePart = typeof cryptoApi?.randomUUID === 'function'
    ? cryptoApi.randomUUID()
    : `${Date.now().toString(36)}-${(++fallbackId).toString(36)}`;
  return `repochealth-${uniquePart}`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Generates a standalone SVG badge and a base64 data URI for a report.
 *
 * @param {{score: number|null, grade: string|null, repo: string, locale: string}} options
 * @returns {{svg: string, dataUri: string}}
 */
export function generateBadgeSvg({ score, grade, repo, locale }) {
  const supportedGrade = Object.hasOwn(GRADE_COLORS, grade) ? grade : null;
  const color = supportedGrade ? GRADE_COLORS[supportedGrade] : '#6e7681';
  const hasScore = typeof score === 'number' && Number.isFinite(score);
  const scoreText = hasScore
    ? `${Number.isInteger(score) ? score : score.toFixed(1)}/100 ${supportedGrade || ''}`.trim()
    : 'N/A';
  const titleId = `${createBadgeId()}-title`;
  const scoreLabel = locale.toLowerCase().startsWith('fr') ? 'Score de' : 'Score for';
  const accessibleTitle = escapeXml(`${scoreLabel} ${repo}: ${scoreText}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="28" viewBox="0 0 200 28" role="img" aria-labelledby="${titleId}"><title id="${titleId}">${accessibleTitle}</title><rect width="200" height="28" rx="4" fill="#555"/><rect x="83" width="117" height="28" rx="4" fill="${color}"/><rect x="79" width="4" height="28" fill="${color}"/><g fill="#fff" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="11" text-anchor="middle"><text x="41.5" y="18">RepoHealth</text><text x="141.5" y="18">${escapeXml(scoreText)}</text></g></svg>`;
  return {
    svg,
    dataUri: `data:image/svg+xml;base64,${encodeBase64(svg)}`
  };
}
