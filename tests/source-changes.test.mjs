import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, utimes, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sourceSnapshot, changedSources } from '../scripts/source-changes.mjs';

test('source snapshots ignore watcher noise and detect edits, additions, and deletions', async t => {
  const root = await mkdtemp(join(tmpdir(), 'threepaw-watch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const page = join(root, 'page.njk');
  await writeFile(page, 'before');
  const initial = await sourceSnapshot([root]);
  await utimes(page, new Date(), new Date());
  await writeFile(page, 'before');
  await writeFile(join(root, '.DS_Store'), 'metadata');
  await writeFile(join(root, 'page.njk~'), 'backup');
  await writeFile(join(root, 'page.njk.tmp'), 'temporary');
  await mkdir(join(root, 'empty'));
  assert.deepEqual(changedSources(initial, await sourceSnapshot([root])), []);
  // An atomic editor save must still register the final file contents.
  await writeFile(join(root, 'page.njk.tmp'), 'after');
  await rename(join(root, 'page.njk.tmp'), page);
  assert.deepEqual(changedSources(initial, await sourceSnapshot([root])), [page]);
  const added = join(root, 'empty', 'new.md');
  await writeFile(added, 'new');
  const withAddition = await sourceSnapshot([root]);
  assert.deepEqual(changedSources(initial, withAddition), [added, page].sort());
  await rm(page);
  assert.deepEqual(changedSources(withAddition, await sourceSnapshot([root])), [page]);
});
