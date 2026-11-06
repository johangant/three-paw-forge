import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';

const assetExtensions = new Set(['.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf']);

// Keep stable filenames while making each changed asset a new browser-cache key.
export async function versionAssetUrls(directory = 'dist', basePath = '') {
  const root = resolve(directory);
  const prefix = basePath.replace(/\/$/, '');
  const hashes = new Map();

  async function version(url, htmlFile) {
    if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return url;
    const [, pathname, query = '', fragment = ''] = url.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    if (!assetExtensions.has(extname(pathname).toLowerCase())) return url;
    let localPath = pathname;
    if (localPath.startsWith('/') && prefix) {
      if (!localPath.startsWith(prefix + '/')) return url;
      localPath = localPath.slice(prefix.length);
    }
    let file;
    try {
      file = localPath.startsWith('/')
        ? resolve(root, '.' + decodeURIComponent(localPath))
        : resolve(dirname(htmlFile), decodeURIComponent(localPath));
    } catch { return url; }
    if (!file.startsWith(root + sep)) return url;
    if (!hashes.has(file)) {
      try {
        hashes.set(file, createHash('sha256').update(await readFile(file)).digest('hex').slice(0, 12));
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') return url;
        throw error;
      }
    }
    const hash = hashes.get(file);
    const params = query.slice(1);
    const existingVersion = /(^|&amp;|&)v=[^&]*/;
    const updatedQuery = existingVersion.test(params)
      ? params.replace(existingVersion, (_, delimiter) => `${delimiter}v=${hash}`)
      : `${params}${params ? '&amp;' : ''}v=${hash}`;
    return `${pathname}?${updatedQuery}${fragment}`;
  }

  async function visit(directoryPath) {
    for (const entry of await readdir(directoryPath, { withFileTypes: true })) {
      const file = resolve(directoryPath, entry.name);
      if (entry.isDirectory()) { await visit(file); continue; }
      if (!entry.isFile() || extname(file) !== '.html') continue;
      const html = await readFile(file, 'utf8');
      const attributes = [...html.matchAll(/\b(href|src|srcset)=(['"])(.*?)\2/g)];
      let result = html;
      // Apply backwards so offsets remain valid as URL lengths change.
      for (const match of attributes.reverse()) {
        const [, attribute, quote, value] = match;
        let updated;
        if (attribute === 'srcset') {
          updated = value;
          if (!value.startsWith('data:')) {
            const candidates = [...value.matchAll(/(^|,\s*)([^\s,]+)/g)];
            for (const candidate of candidates.reverse()) {
              const start = candidate.index + candidate[1].length;
              const replacement = await version(candidate[2], file);
              updated = updated.slice(0, start) + replacement + updated.slice(start + candidate[2].length);
            }
          }
        } else updated = await version(value, file);
        result = result.slice(0, match.index) + `${attribute}=${quote}${updated}${quote}` + result.slice(match.index + match[0].length);
      }
      if (result !== html) await writeFile(file, result);
    }
  }

  await visit(root);
}
