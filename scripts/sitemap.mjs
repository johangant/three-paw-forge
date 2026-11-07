import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { escapeXml, feedBaseUrl } from './rss.mjs';

export async function writeSitemap(directory, siteUrl) {
  const root = resolve(directory);
  const base = feedBaseUrl(siteUrl);
  const entries = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = resolve(path, entry.name);
      if (entry.isDirectory()) { await visit(file); continue; }
      if (!entry.name.endsWith('.html')) continue;
      const html = await readFile(file, 'utf8');
      const noindex = [...html.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) => /name=["']robots["']/i.test(tag) && /content=["'][^"']*\bnoindex\b/i.test(tag));
      if (noindex) continue;
      const route = relative(root, file).split(sep).join('/').replace(/index\.html$/, '');
      const url = new URL(route, base).href;
      const modified = html.match(/Last updated: <time datetime="([^"]+)"/i)?.[1];
      entries.push({ url, modified });
    }
  }
  await visit(root);
  entries.sort((a, b) => a.url.localeCompare(b.url));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url><loc>${escapeXml(entry.url)}</loc>${entry.modified ? `<lastmod>${escapeXml(entry.modified)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>\n`;
  await writeFile(resolve(root, 'sitemap.xml'), xml);
  await writeFile(resolve(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', base).href}\n`);
  console.log(`[sitemap] ${entries.length} public pages`);
}
