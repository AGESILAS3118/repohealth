import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('i18n - Les fichiers de traductions existent et sont du JSON valide', () => {
  const frPath = resolve(__dirname, '../src/i18n/fr.json');
  const enPath = resolve(__dirname, '../src/i18n/en.json');

  assert.equal(existsSync(frPath), true, 'fr.json doit exister');
  assert.equal(existsSync(enPath), true, 'en.json doit exister');

  const frContent = JSON.parse(readFileSync(frPath, 'utf-8'));
  const enContent = JSON.parse(readFileSync(enPath, 'utf-8'));

  assert.ok(frContent.appTitle);
  assert.ok(enContent.appTitle);
});

test('i18n - Clés identiques entre français et anglais', () => {
  const fr = JSON.parse(readFileSync(resolve(__dirname, '../src/i18n/fr.json'), 'utf-8'));
  const en = JSON.parse(readFileSync(resolve(__dirname, '../src/i18n/en.json'), 'utf-8'));

  function getKeys(obj, prefix = '') {
    let keys = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys = keys.concat(getKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys.sort();
  }

  const frKeys = getKeys(fr);
  const enKeys = getKeys(en);

  assert.deepEqual(frKeys, enKeys, 'Les structures de clés en fr.json et en.json doivent être strictement identiques');
});

test('i18n - Aucune valeur vide dans les fichiers de traduction', () => {
  const fr = JSON.parse(readFileSync(resolve(__dirname, '../src/i18n/fr.json'), 'utf-8'));
  const en = JSON.parse(readFileSync(resolve(__dirname, '../src/i18n/en.json'), 'utf-8'));

  function assertNoEmptyValues(obj, lang) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        assert.ok(value.trim().length > 0, `La clé "${key}" dans ${lang} ne doit pas être vide`);
      } else if (typeof value === 'object' && value !== null) {
        assertNoEmptyValues(value, lang);
      }
    }
  }

  assertNoEmptyValues(fr, 'fr.json');
  assertNoEmptyValues(en, 'en.json');
});

test('i18n - messages des scores indisponibles et avertissement de sécurité présents', () => {
  const fr = JSON.parse(readFileSync(resolve(__dirname, '../src/i18n/fr.json'), 'utf-8'));
  const en = JSON.parse(readFileSync(resolve(__dirname, '../src/i18n/en.json'), 'utf-8'));

  assert.equal(fr.report_analysis_unavailable, 'Analyse impossible : données insuffisantes pour ce dépôt.');
  assert.equal(fr.report_security_warning, 'Ce score est une aide à la décision. Il ne remplace pas une revue humaine du code ni un audit professionnel de sécurité.');
  assert.equal(en.report_security_warning, 'This score is a decision aid. It does not replace human code review or a professional security audit.');
  assert.ok(fr.report_not_verifiable);
  assert.ok(fr.report_insufficient_data);
  assert.ok(en.report_not_verifiable);
  assert.ok(en.report_insufficient_data);
});

test('i18n - toutes les clés report.* utilisées par le rendu ont une traduction résolue', () => {
  const fr = JSON.parse(readFileSync(resolve(__dirname, '../src/i18n/fr.json'), 'utf-8'));
  const en = JSON.parse(readFileSync(resolve(__dirname, '../src/i18n/en.json'), 'utf-8'));
  const mainSource = readFileSync(resolve(__dirname, '../src/main.js'), 'utf-8');
  const usedKeys = [...mainSource.matchAll(/\bt\(['"](report(?:\.[A-Za-z0-9_]+)+)['"]\)/g)]
    .map((match) => match[1]);

  function getTranslation(dictionary, path) {
    return path.split('.').reduce((value, key) => value?.[key], dictionary);
  }

  assert.ok(usedKeys.includes('report.export.title'));
  assert.ok(usedKeys.includes('report.export.description'));
  assert.ok(usedKeys.includes('report.export.download'));
  for (const key of usedKeys) {
    for (const dictionary of [fr, en]) {
      const value = getTranslation(dictionary, key);
      assert.equal(typeof value, 'string', `${key} must be translated`);
      assert.notEqual(value, key, `${key} must not appear as a raw key`);
    }
  }
});
