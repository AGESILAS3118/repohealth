import { ENGINE_VERSION } from '../scoring/version.js';

const DISCLAIMER = {
  fr: 'Ce score est une aide à la décision. Il ne remplace pas une revue humaine du code ni un audit professionnel de sécurité.',
  en: 'This score is a decision aid. It does not replace human code review or a professional security audit.'
};

function toIsoTimestamp(value, fieldName) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError(`${fieldName} must be a valid date`);
  }
  return date.toISOString();
}

function toFilenameSegment(value) {
  const segment = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return segment || 'unknown';
}

function serializableData(value) {
  if (Array.isArray(value)) {
    return value.map(serializableData).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => typeof item !== 'function' && typeof item !== 'symbol' && item !== undefined)
        .map(([key, item]) => [key, serializableData(item)])
    );
  }
  if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
    return undefined;
  }
  return value;
}

/**
 * Builds a versioned, human-readable JSON export of a scoring report.
 *
 * @param {import('../scoring/types.js').ScoreReport} report
 * @param {{
 *   owner: string,
 *   name: string,
 *   url?: string,
 *   analyzedAt?: string,
 *   generatedAt?: string|Date,
 *   pillarNames?: Record<string, string>
 * }} meta
 * @returns {{json: string, filename: string}}
 */
export function buildExportPayload(report, meta) {
  const generatedAt = toIsoTimestamp(meta.generatedAt ?? new Date(), 'generatedAt');
  const analyzedAt = toIsoTimestamp(meta.analyzedAt ?? report.computedAt, 'analyzedAt');
  const owner = String(meta.owner ?? '');
  const name = String(meta.name ?? '');
  const fullName = `${owner}/${name}`;

  const payload = {
    schemaVersion: '1.0',
    engineVersion: ENGINE_VERSION,
    generatedAt,
    analyzedAt,
    repository: {
      owner,
      name,
      fullName,
      url: meta.url || `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
    },
    score: typeof report.score === 'number' && Number.isFinite(report.score) ? report.score : null,
    grade: typeof report.grade === 'string' ? report.grade : null,
    pillars: (Array.isArray(report.pillars) ? report.pillars : []).map((pillar) => ({
      id: pillar.id,
      name: meta.pillarNames?.[pillar.id] || meta.pillarNames?.[pillar.labelKey] || pillar.name || pillar.labelKey || pillar.id,
      weight: pillar.weight,
      score: typeof pillar.score === 'number' && Number.isFinite(pillar.score) ? pillar.score : null,
      status: pillar.status || null,
      checks: serializableData(Array.isArray(pillar.checks) ? pillar.checks : []),
      recommendations: serializableData(Array.isArray(pillar.recommendations) ? pillar.recommendations : [])
    })),
    unverifiablePillars: serializableData(Array.isArray(report.unverifiablePillars) ? report.unverifiablePillars : []),
    disclaimer: { ...DISCLAIMER }
  };

  const filenameDate = generatedAt.slice(0, 10);
  const filename = `repochealth-${toFilenameSegment(owner)}-${toFilenameSegment(name)}-${filenameDate}.json`;

  return {
    json: JSON.stringify(serializableData(payload), null, 2),
    filename
  };
}
