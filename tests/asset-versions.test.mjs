import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { versionAssetUrls } from '../scripts/asset-versions.mjs';

async function fixture(t, html) {
  const root = await mkdtemp(join(tmpdir(), 'threepaw-assets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'images'));
  await mkdir(join(root, 'about'));
  await writeFile(join(root, 'styles.css'), 'body { color: black }');
  await writeFile(join(root, 'images/photo.webp'), 'photo');
  await writeFile(join(root, 'images/large.webp'), 'larger photo');
  await writeFile(join(root, 'index.html'), html);
  return root;
}

test('asset versions are deterministic, idempotent, and change with content', async t => {
  const root = await fixture(t, '<link href="/styles.css"><img src="/images/photo.webp">');
  await versionAssetUrls(root);
  const first = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(first, /styles\.css\?v=[a-f0-9]{12}/);
  await versionAssetUrls(root);
  assert.equal(await readFile(join(root, 'index.html'), 'utf8'), first);
  await writeFile(join(root, 'styles.css'), 'body { color: red }');
  await versionAssetUrls(root);
  const changed = await readFile(join(root, 'index.html'), 'utf8');
  assert.notEqual(changed.match(/styles\.css\?v=([a-f0-9]+)/)[1], first.match(/styles\.css\?v=([a-f0-9]+)/)[1]);
  assert.equal(changed.match(/photo.webp\?v=([a-f0-9]+)/)[1], first.match(/photo.webp\?v=([a-f0-9]+)/)[1]);
});

test('picture srcsets and relative URLs resolve under a base path', async t => {
  const root = await fixture(t, '<picture><source srcset="/forge/images/photo.webp 320w, /forge/images/large.webp 960w"><img src="/forge/images/photo.webp"></picture>');
  await writeFile(join(root, 'about/index.html'), "<img src='../images/photo.webp'>");
  await versionAssetUrls(root, '/forge/');
  const html = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(html, /photo\.webp\?v=[a-f0-9]{12} 320w, \/forge\/images\/large\.webp\?v=[a-f0-9]{12} 960w/);
  assert.match(await readFile(join(root, 'about/index.html'), 'utf8'), /src='\.\.\/images\/photo\.webp\?v=[a-f0-9]{12}'/);
});

test('navigation, external, data, missing, and out-of-root URLs stay unchanged', async t => {
  const original = '<a href="/about/">About</a><a href="/index.html">Home</a><img src="https://example.com/photo.webp"><img src="//example.com/photo.webp"><img src="data:image/webp;base64,ABC"><source srcset="data:image/webp;base64,ABC"><a href="mailto:person@example.com">Email</a><a href="#gallery">Gallery</a><img src="/missing.webp"><img src="../../outside.webp">';
  const root = await fixture(t, original);
  await versionAssetUrls(root);
  assert.equal(await readFile(join(root, 'index.html'), 'utf8'), original);
});

test('existing queries and fragments survive and previous versions are replaced', async t => {
  const root = await fixture(t, '<link href="/styles.css?theme=light&amp;v=old#top"><img src="/images/photo.webp?size=small#detail"><img src="/images/photo.webp?v=old&amp;size=large">');
  await versionAssetUrls(root);
  const html = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(html, /styles\.css\?theme=light&amp;v=[a-f0-9]{12}#top/);
  assert.match(html, /photo\.webp\?size=small&amp;v=[a-f0-9]{12}#detail/);
  assert.match(html, /photo\.webp\?v=[a-f0-9]{12}&amp;size=large/);
  await versionAssetUrls(root);
  assert.equal(await readFile(join(root, 'index.html'), 'utf8'), html);
});
