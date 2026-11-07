import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const sourcePaths = ['eleventy.config.js', 'assets/images.json', 'src', 'public', 'scripts'];

// Filesystem notifications can describe metadata changes, directory activity, or
// editor saves with identical contents. Only rebuild for changed build inputs.
export async function sourceSnapshot(paths = sourcePaths) {
  const files = new Map();
  async function visit(path) {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || /(?:~|\.sw[opx]|\.tmp)$/.test(entry.name)) continue;
        if (entry.isDirectory() || entry.isFile()) await visit(join(path, entry.name));
      }
    } catch (error) {
      if (error.code === 'ENOENT') return;
      if (error.code !== 'ENOTDIR') throw error;
      try {
        files.set(path, createHash('sha256').update(await readFile(path)).digest('hex'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  for (const path of paths) await visit(path);
  return files;
}

export function changedSources(previous, current) {
  return [...new Set([...previous.keys(), ...current.keys()])]
    .filter(path => previous.get(path) !== current.get(path)).sort();
}
