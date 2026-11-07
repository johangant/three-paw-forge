import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gitDates, renderDates, pageDependencies } from '../scripts/publication.mjs';

function git(cwd, args, date = '2026-09-08T12:00:00Z') {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: {
    ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
    GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date,
  } });
}

test('Git dates follow page renames, ignore uncommitted/unrelated edits, and include dependency changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'git-dates-'));
  try {
    git(root, ['init']);
    await writeFile(join(root, 'page.html'), 'page');
    await writeFile(join(root, 'shared.njk'), 'shared');
    await mkdir(join(root, 'pieces'));
    await writeFile(join(root, 'pieces/piece.md'), 'piece');
    git(root, ['add', '.']); git(root, ['commit', '-m', 'Initial']);
    assert.deepEqual(gitDates('page.html', ['shared.njk'], root), { firstPublished: '2026-09-08T12:00:00.000Z', lastUpdated: '2026-09-08T12:00:00.000Z' });
    git(root, ['mv', 'page.html', 'page.njk']); git(root, ['commit', '-m', 'Rename'], '2026-10-01T12:00:00Z');
    assert.equal(gitDates('page.njk', [], root).firstPublished, '2026-09-08T12:00:00.000Z');
    await writeFile(join(root, 'unrelated.md'), 'unrelated');
    git(root, ['add', '.']); git(root, ['commit', '-m', 'Unrelated'], '2026-10-02T12:00:00Z');
    await writeFile(join(root, 'page.njk'), 'uncommitted edit');
    assert.equal(gitDates('page.njk', ['shared.njk'], root).lastUpdated, '2026-10-01T12:00:00.000Z');
    await writeFile(join(root, 'shared.njk'), 'updated shared include');
    git(root, ['add', 'shared.njk']); git(root, ['commit', '-m', 'Shared change'], '2026-11-05T12:00:00Z');
    assert.equal(gitDates('page.njk', ['shared.njk'], root).lastUpdated, '2026-11-05T12:00:00.000Z');
    git(root, ['rm', 'pieces/piece.md']); git(root, ['commit', '-m', 'Remove piece'], '2026-11-06T12:00:00Z');
    assert.equal(gitDates('page.njk', ['pieces'], root).lastUpdated, '2026-11-06T12:00:00.000Z');
    await writeFile(join(root, 'new.njk'), 'uncommitted page');
    assert.deepEqual(gitDates('new.njk', ['shared.njk'], root), { firstPublished: null, lastUpdated: null });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('page dependencies include nested layouts, relevant content and prefixed assets', async () => {
  const dependencies = await pageDependencies('src/index.njk', '<img src="/prefix/images/scrollwork-960.jpg"><script src="/prefix/gallery-lightbox.js"></script>', process.cwd(), '/prefix');
  for (const path of ['src/index.njk', 'src/_includes/layouts/base.njk', 'src/_includes/head.njk', 'src/_includes/header.njk', 'src/_includes/footer.njk', 'src/_data/site.json', 'src/pieces', 'src/styles.css', 'public/images/scrollwork-960.jpg', 'public/gallery-lightbox.js']) assert.ok(dependencies.includes(path), path);
  assert.ok(!dependencies.includes('src/_data/faq.json'));
  assert.ok(dependencies.includes('src/_data/featuredWork.json'));
  const project = await pageDependencies('src/pieces/spoons.md', '');
  assert.ok(project.includes('src/pieces/pieces.json'));
  assert.ok(project.includes('src/_includes/layouts/work-project.njk'));
  assert.ok(project.includes('src/_includes/footer.njk'));
  assert.ok(project.includes('scripts/work-gallery.mjs'));
  const faq = await pageDependencies('src/faq/index.njk', '');
  assert.ok(faq.includes('src/_data/faq.json'));
  assert.ok(faq.includes('scripts/faq-markdown.mjs'));
});

test('date rendering has machine-readable timestamps and honest uncommitted labels', () => {
  assert.match(renderDates({ firstPublished: '2026-09-08T12:00:00Z', lastUpdated: '2026-11-05T13:00:00Z' }), /datetime="2026-09-08T12:00:00.000Z">8 Sept 2026/);
  assert.match(renderDates({ firstPublished: null, lastUpdated: null }), /not yet committed/);
});
