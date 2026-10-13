import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRepoInput, isValidRepoInput } from '../src/utils/url.js';

test('parseRepoInput - formats owner/repo valides', () => {
  const cases = [
    { input: 'facebook/react', expected: { owner: 'facebook', repo: 'react' } },
    { input: 'torvalds/linux', expected: { owner: 'torvalds', repo: 'linux' } },
    { input: 'vuejs/core', expected: { owner: 'vuejs', repo: 'core' } },
    { input: 'my-org/my-repo_123.js', expected: { owner: 'my-org', repo: 'my-repo_123.js' } },
    { input: '  denoland/deno  ', expected: { owner: 'denoland', repo: 'deno' } }
  ];

  for (const { input, expected } of cases) {
    const res = parseRepoInput(input);
    assert.deepEqual(res, expected, `Échec pour l'entrée: ${input}`);
    assert.equal(isValidRepoInput(input), true);
  }
});

test('parseRepoInput - URLs complètes valides', () => {
  const cases = [
    { input: 'https://github.com/facebook/react', expected: { owner: 'facebook', repo: 'react' } },
    { input: 'http://github.com/torvalds/linux', expected: { owner: 'torvalds', repo: 'linux' } },
    { input: 'https://github.com/facebook/react.git', expected: { owner: 'facebook', repo: 'react' } },
    { input: 'https://github.com/vercel/next.js/', expected: { owner: 'vercel', repo: 'next.js' } },
    { input: 'https://github.com/nodejs/node/tree/main', expected: { owner: 'nodejs', repo: 'node' } },
    { input: 'https://github.com/golang/go?tab=readme-ov-file#readme', expected: { owner: 'golang', repo: 'go' } }
  ];

  for (const { input, expected } of cases) {
    const res = parseRepoInput(input);
    assert.deepEqual(res, expected, `Échec pour l'entrée URL: ${input}`);
    assert.equal(isValidRepoInput(input), true);
  }
});

test('parseRepoInput - entrées invalides', () => {
  const invalidCases = [
    '',
    '   ',
    null,
    undefined,
    12345,
    'react',
    '/react',
    'facebook/',
    'https://gitlab.com/owner/repo',
    'https://bitbucket.org/owner/repo',
    'ftp://github.com/owner/repo',
    '-invalidowner/repo',
    'owner/-invalidrepo',
    'https://github.com/'
  ];

  for (const input of invalidCases) {
    const res = parseRepoInput(input);
    assert.equal(res, null, `L'entrée aurait dû être rejetée: ${input}`);
    assert.equal(isValidRepoInput(input), false);
  }
});
