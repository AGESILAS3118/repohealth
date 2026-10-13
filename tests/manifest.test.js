import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.webmanifest'), 'utf8'));

function assertPngAsset(asset, expectedSize) {
  assert.ok(asset.src.startsWith('./'), `${asset.src} must be relative`);
  assert.equal(asset.type, 'image/png');
  const png = readFileSync(resolve(root, asset.src.slice(2)));
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.deepEqual(
    [png.readUInt32BE(16), png.readUInt32BE(20)],
    expectedSize
  );
}

test('manifest - PWA identity, start URL, and scope are present and relative', () => {
  assert.ok(manifest.name);
  assert.ok(manifest.short_name);
  assert.ok(manifest.theme_color);
  assert.ok(manifest.background_color);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './index.html');
  assert.equal(manifest.scope, './');
});

test('manifest - declares square any and maskable PNG icons', () => {
  const icons = manifest.icons;
  assert.ok(icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert.ok(icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'));
  assert.ok(icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  assertPngAsset(icons.find((icon) => icon.sizes === '192x192'), [192, 192]);
  assertPngAsset(icons.find((icon) => icon.sizes === '512x512'), [512, 512]);
});

test('manifest - declares accessible desktop and mobile PNG screenshots', () => {
  const screenshots = manifest.screenshots;
  assert.ok(screenshots.some((shot) => shot.form_factor === 'wide'));
  assert.ok(screenshots.some((shot) => !shot.form_factor || shot.form_factor !== 'wide'));
  assertPngAsset(screenshots.find((shot) => shot.sizes === '1280x720'), [1280, 720]);
  assertPngAsset(screenshots.find((shot) => shot.sizes === '750x1334'), [750, 1334]);
});
