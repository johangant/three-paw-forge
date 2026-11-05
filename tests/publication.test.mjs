import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publicationRecord, validateHistory, pageHash, renderDates, annotatePublication, normalizePublicationUrl } from '../scripts/publication.mjs';

const hash = 'a'.repeat(64);
const prior = { hash, firstPublished: '2026-09-08', lastUpdated: '2026-10-21' };

test('local edits and rebuilds retain published dates', () => {
  assert.deepEqual(publicationRecord(prior, null, 'b'.repeat(64), null), { ...prior, hash: 'b'.repeat(64) });
  assert.equal(publicationRecord(null, null, hash, null).firstPublished, null);
});
test('an unchanged release retains dates; a changed release updates only last updated', () => {
  assert.deepEqual(publicationRecord(prior, null, hash, '2026-11-05'), prior);
  assert.deepEqual(publicationRecord(prior, null, 'b'.repeat(64), '2026-11-05'), { ...prior, hash: 'b'.repeat(64), lastUpdated: '2026-11-05' });
});
test('new pages receive first publication dates; existing unrecorded pages do not', () => {
  assert.equal(publicationRecord(null, null, hash, '2026-11-05').firstPublished, '2026-11-05');
  assert.equal(publicationRecord(null, { firstPublished: null }, hash, '2026-11-05').firstPublished, null);
  assert.equal(publicationRecord({ hash: 'b'.repeat(64), firstPublished: null }, null, hash, '2026-11-05').firstPublished, null);
});
test('invalid dates and malformed history fail rather than reset history', () => {
  assert.throws(() => publicationRecord(null, null, hash, '2026-02-30'));
  assert.throws(() => validateHistory({ version: 2, pages: {} }));
  assert.throws(() => validateHistory({ version: 1, pages: { '/': { firstPublished: 'tomorrow' } } }));
  assert.match(renderDates(prior), /<time datetime="2026-09-08">8 Sept 2026<\/time>/);
});
test('referenced images and shared assets affect page hashes, unrelated assets do not', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-assets-'));
  try {
    await mkdir(join(root, 'images'));
    await writeFile(join(root, 'styles.css'), 'body{}');
    await writeFile(join(root, 'images/photo.webp'), 'photo one');
    const html = '<link href="/prefix/styles.css"><source srcset="/prefix/images/photo.webp 320w"><!--PUBLICATION_DATES-->';
    const first = await pageHash(html, root, '/prefix');
    await writeFile(join(root, 'unrelated.jpg'), 'unrelated');
    assert.equal(await pageHash(html, root, '/prefix'), first);
    await writeFile(join(root, 'images/photo.webp'), 'photo two');
    assert.notEqual(await pageHash(html, root, '/prefix'), first);
    await writeFile(join(root, 'images/photo.webp'), 'photo one');
    await writeFile(join(root, 'styles.css'), 'body{color:red}');
    assert.notEqual(await pageHash(html, root, '/prefix'), first);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('publication registry and footer travel together; repeated release and failed fetch are safe', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-release-'));
  const savedFetch = globalThis.fetch;
  const savedEnv = { ...process.env };
  const html = '<main>Example</main><footer><!--PUBLICATION_DATES--></footer>';
  try {
    await mkdir(join(root, 'new-page'));
    await writeFile(join(root, 'new-page/index.html'), html);
    process.env.PUBLICATION_MODE = 'publish';
    process.env.PUBLICATION_BASE_URL = 'https://example.test';
    process.env.PUBLICATION_DATE = '2026-11-05';
    let requests = [];
    globalThis.fetch = async url => { requests.push(url); return new Response('', { status: 404 }); };
    await annotatePublication(root);
    assert.equal(requests.length, 2);
    const history = JSON.parse(await readFile(join(root, 'publication.json'), 'utf8'));
    assert.equal(history.pages['/new-page/'].firstPublished, '2026-11-05');
    assert.match(await readFile(join(root, 'new-page/index.html'), 'utf8'), /datetime="2026-11-05"/);
    history.pages['/removed-page/'] = prior;
    await writeFile(join(root, 'new-page/index.html'), html);
    process.env.PUBLICATION_DATE = '2026-11-06';
    globalThis.fetch = async () => Response.json(history);
    await annotatePublication(root);
    const repeated = JSON.parse(await readFile(join(root, 'publication.json'), 'utf8'));
    assert.equal(repeated.pages['/new-page/'].lastUpdated, '2026-11-05');
    assert.deepEqual(repeated.pages['/removed-page/'], prior);
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(annotatePublication(root), /refusing to reset/);
    assert.deepEqual(JSON.parse(await readFile(join(root, 'publication.json'), 'utf8')), repeated);
  } finally {
    globalThis.fetch = savedFetch;
    process.env = savedEnv;
    await rm(root, { recursive: true, force: true });
  }
});


test('Pages HTTP metadata is upgraded to HTTPS without losing the project path', () => {
  assert.equal(normalizePublicationUrl('http://www.threepawforge.co.uk/'), 'https://www.threepawforge.co.uk');
  assert.equal(normalizePublicationUrl('http://example.github.io/project/'), 'https://example.github.io/project');
  assert.equal(normalizePublicationUrl('https://example.test/project/?query=ignored#fragment'), 'https://example.test/project');
  assert.throws(() => normalizePublicationUrl('ftp://example.test/'));
  assert.throws(() => normalizePublicationUrl('https://user:password@example.test/'));
});

test('a publishing build distinguishes new, changed and unchanged pages and annotates only the appropriate dates', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-pages-'));
  const savedFetch = globalThis.fetch;
  const savedEnv = { ...process.env };
  const original = '<main>Original content</main><footer><!--PUBLICATION_DATES--></footer>';
  const changed = original.replace('Original content', 'Changed content');
  try {
    const originalHash = await pageHash(original, root);
    const history = { version: 1, pages: {
      '/stable/': { ...prior, hash: originalHash },
      '/changed/': { ...prior, hash: originalHash },
    } };
    for (const [name, html] of [['stable', original], ['changed', changed], ['new', original]]) {
      await mkdir(join(root, name));
      await writeFile(join(root, name, 'index.html'), html);
    }
    process.env.PUBLICATION_MODE = 'publish';
    process.env.PUBLICATION_BASE_URL = 'http://example.test/project/';
    process.env.PUBLICATION_DATE = '2026-11-05';
    globalThis.fetch = async url => {
      assert.match(url, /^https:\/\/example\.test\/project\/publication\.json/);
      return Response.json(history);
    };
    await annotatePublication(root);
    const published = JSON.parse(await readFile(join(root, 'publication.json'), 'utf8'));
    assert.deepEqual(published.pages['/stable/'], history.pages['/stable/']);
    assert.equal(published.pages['/changed/'].firstPublished, '2026-09-08');
    assert.equal(published.pages['/changed/'].lastUpdated, '2026-11-05');
    assert.equal(published.pages['/new/'].firstPublished, '2026-11-05');
    assert.equal(published.pages['/new/'].lastUpdated, '2026-11-05');
    const stableHtml = await readFile(join(root, 'stable/index.html'), 'utf8');
    const changedHtml = await readFile(join(root, 'changed/index.html'), 'utf8');
    assert.match(stableHtml, /datetime="2026-10-21"/);
    assert.ok(!stableHtml.includes('2026-11-05'));
    assert.match(changedHtml, /datetime="2026-09-08"/);
    assert.match(changedHtml, /datetime="2026-11-05"/);
  } finally {
    globalThis.fetch = savedFetch;
    process.env = savedEnv;
    await rm(root, { recursive: true, force: true });
  }
});
