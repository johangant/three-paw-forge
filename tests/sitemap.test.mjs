import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeSitemap } from '../scripts/sitemap.mjs';

test('sitemap discovers pages and stories, omits noindex/assets, preserves known dates and subpaths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sitemap-test-'));
  try {
    await mkdir(join(root, 'work/story'), { recursive: true });
    await writeFile(join(root, 'index.html'), '<footer>Last updated: <time datetime="2026-11-05T12:00:00.000Z">5 Nov 2026</time></footer>');
    await writeFile(join(root, 'work/story/index.html'), '<h1>New story</h1>');
    await writeFile(join(root, 'private.html'), '<meta content="noindex,follow" name="robots">');
    await writeFile(join(root, 'feed.xml'), '<rss/>');
    await writeSitemap(root, 'https://example.com/project/');
    const xml = await readFile(join(root, 'sitemap.xml'), 'utf8');
    assert.match(xml, /<loc>https:\/\/example.com\/project\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example.com\/project\/work\/story\/<\/loc>/);
    assert.equal((xml.match(/<lastmod>/g) || []).length, 1);
    assert.ok(!xml.includes('private.html') && !xml.includes('feed.xml'));
    assert.match(await readFile(join(root, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/example.com\/project\/sitemap.xml/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
