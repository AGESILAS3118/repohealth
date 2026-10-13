import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBadgeSvg } from '../src/badge/generate.js';

test('badge - le SVG contient le score et le grade', () => {
  const { svg } = generateBadgeSvg({ score: 87, grade: 'B', repo: 'octocat/repo', locale: 'fr' });
  assert.match(svg, /87\/100 B/);
  assert.match(svg, /<text x="141\.5" y="18">87\/100 B<\/text>/);
});

test('badge - applique la couleur associée à chaque grade', async (t) => {
  const colors = {
    'A+': '#2ea043',
    A: '#2ea043',
    B: '#3fb950',
    C: '#d29922',
    D: '#db6d28',
    F: '#da3633'
  };

  for (const [grade, color] of Object.entries(colors)) {
    await t.test(grade, () => {
      const { svg } = generateBadgeSvg({ score: 90, grade, repo: 'owner/repo', locale: 'en' });
      assert.ok(svg.includes(`fill="${color}"`));
    });
  }
});

test('badge - échappe les caractères XML du nom de dépôt', () => {
  const { svg } = generateBadgeSvg({
    score: 87,
    grade: 'B',
    repo: `owner/<repo>&"'</repo>`,
    locale: 'fr'
  });

  assert.ok(svg.includes('owner/&lt;repo&gt;&amp;&quot;&apos;&lt;/repo&gt;'));
  assert.ok(!svg.includes(`owner/<repo>&"'</repo>`));
});

test('badge - fournit un data URI SVG base64 décodable', () => {
  const result = generateBadgeSvg({ score: 87, grade: 'B', repo: 'owner/repo', locale: 'en' });
  assert.ok(result.dataUri.startsWith('data:image/svg+xml;base64,'));
  assert.equal(Buffer.from(result.dataUri.split(',')[1], 'base64').toString('utf8'), result.svg);
});

test('badge - le SVG a des balises équilibrées et une racine standalone', () => {
  const { svg } = generateBadgeSvg({ score: 87, grade: 'B', repo: 'owner/repo', locale: 'en' });
  const tags = [...svg.matchAll(/<\/?([a-z][\w:-]*)(?:\s[^<>]*?)?\s*\/?>/gi)]
    .map((match) => ({ name: match[1], closing: match[0].startsWith('</'), selfClosing: match[0].endsWith('/>') }));
  const stack = [];

  for (const tag of tags) {
    if (tag.closing) {
      assert.equal(stack.pop(), tag.name);
    } else if (!tag.selfClosing) {
      stack.push(tag.name);
    }
  }

  assert.deepEqual(stack, []);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="200" height="28" viewBox="0 0 200 28"/);
});

test('badge - score null affiche N/A avec la couleur grise', () => {
  const { svg } = generateBadgeSvg({ score: null, grade: null, repo: 'owner/repo', locale: 'fr' });
  assert.match(svg, />N\/A<\/text>/);
  assert.ok(svg.includes('fill="#6e7681"'));
});

test('badge - le label visible est prévu pour les locales française et anglaise', () => {
  const french = generateBadgeSvg({ score: 87, grade: 'B', repo: 'owner/repo', locale: 'fr' }).svg;
  const english = generateBadgeSvg({ score: 87, grade: 'B', repo: 'owner/repo', locale: 'en' }).svg;
  assert.match(french, />RepoHealth<\/text>/);
  assert.match(english, />RepoHealth<\/text>/);
  assert.match(french, />Score de owner\/repo:/);
  assert.match(english, />Score for owner\/repo:/);
});

test('badge - identifiants de titre uniques entre deux SVG', () => {
  const options = { score: 87, grade: 'B', repo: 'owner/repo', locale: 'en' };
  const first = generateBadgeSvg(options).svg.match(/aria-labelledby="([^"]+)"/)[1];
  const second = generateBadgeSvg(options).svg.match(/aria-labelledby="([^"]+)"/)[1];
  assert.notEqual(first, second);
});
