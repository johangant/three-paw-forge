import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname, basename, sep } from 'node:path';
import { normalizeBasePath } from './site-paths.mjs';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function gitDates(source, dependencies, cwd = process.cwd()) {
  if (git(['rev-parse', '--is-shallow-repository'], cwd) === 'true') {
    throw new Error('Footer dates require full Git history. Use fetch-depth: 0 in checkout.');
  }
  const history = git(['log', '--follow', '--format=%cI', '--', source], cwd).split('\n').filter(Boolean);
  if (!history.length) return { firstPublished: null, lastUpdated: null };
  // The Eleventy conversion rewrote some pages too heavily for Git's rename
  // detection. Include the former HTML source for the same route when it exists.
  const legacy = source.replace(/\.(?:njk|md)$/, '.html');
  const legacyHistory = legacy !== source ? git(['log', '--follow', '--format=%cI', '--', legacy], cwd).split('\n').filter(Boolean) : [];
  const first = [...history, ...legacyHistory].sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  const latest = git(['log', '-1', '--format=%cI', '--', ...new Set([source, ...dependencies])], cwd);
  return { firstPublished: new Date(first).toISOString(), lastUpdated: new Date(latest || history[0]).toISOString() };
}

export function renderDates(record) {
  const time = value => {
    if (!value) return 'not yet committed';
    const date = new Date(value);
    const label = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }).format(date);
    return `<time datetime="${date.toISOString()}">${label}</time>`;
  };
  return `First published: ${time(record.firstPublished)} <span aria-hidden="true">·</span> Last updated: ${time(record.lastUpdated)}`;
}

async function htmlFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) result.push(path);
  }
  return result.sort();
}

export async function pageDependencies(source, html, cwd = process.cwd(), basePath = '') {
  const dependencies = new Set(['src/styles.css', 'eleventy.config.js', 'scripts/build.mjs', 'scripts/publication.mjs', 'scripts/site-paths.mjs', 'scripts/asset-versions.mjs', 'package.json', 'package-lock.json']);
  const visited = new Set();
  async function template(path) {
    if (visited.has(path)) return;
    visited.add(path);
    dependencies.add(path);
    const text = await readFile(resolve(cwd, path), 'utf8');
    for (const match of text.matchAll(/{%\s*(?:include|extends)\s+["']([^"']+)["']/g)) {
      await template(`src/_includes/${match[1]}`);
    }
    const layout = text.match(/^layout:\s*["']?([^\s"']+)/m);
    if (layout) await template(`src/_includes/${layout[1]}`);
    if (/\bsite\./.test(text)) dependencies.add('src/_data/site.json');
    if (/\bfaq\b/.test(text)) dependencies.add('src/_data/faq.json');
    if (/\bfaqMarkdown\b/.test(text)) dependencies.add('scripts/faq-markdown.mjs');
    if (/\bcontactMap\b/.test(text)) dependencies.add('scripts/contact-map.mjs');
    if (/\b(?:workPhoto|projectCard|collections\.featuredWork)\b/.test(text)) {
      dependencies.add('scripts/work-gallery.mjs');
      dependencies.add('assets/images.json');
    }
    if (/\bcurrentWorkPhotos\b/.test(text)) {
      dependencies.add('src/_data/currentWork.json');
      dependencies.add('scripts/work-gallery.mjs');
      dependencies.add('assets/images.json');
      dependencies.add('assets/source/work/wip');
    }
    if (/\bcollections\.featuredWork\b/.test(text)) dependencies.add('src/_data/featuredWork.json');
    if (/\bcollections\.(?:pieces|featuredWork)\b/.test(text)) {
      dependencies.add('src/pieces'); // A directory pathspec includes additions and deletions too.
    }
  }
  await template(source);
  // Directory data supplies project layouts and permalinks to each Markdown file.
  let parent = dirname(source);
  while (parent === 'src' || parent.startsWith('src/')) {
    const dataPath = `${parent}/${basename(parent)}.json`;
    try {
      const data = JSON.parse(await readFile(resolve(cwd, dataPath), 'utf8'));
      dependencies.add(dataPath);
      if (data.layout) await template(`src/_includes/${data.layout}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    parent = dirname(parent);
  }
  for (const match of html.matchAll(/\b(?:src|href|srcset)="([^"]*)"/g)) {
    for (const candidate of match[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (!url?.startsWith('/') || url.startsWith('//')) continue;
      const pathname = new URL(url, 'https://local.invalid').pathname;
      const local = basePath && pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;
      if (/\.(?:css|js|jpg|jpeg|png|webp|svg|avif|woff2?)$/i.test(local) && local !== '/styles.css') {
        const path = resolve(cwd, 'public', `.${decodeURIComponent(local)}`);
        if (!path.startsWith(resolve(cwd, 'public') + sep)) throw new Error('Asset path escapes public directory.');
        dependencies.add(relative(cwd, path).split(sep).join('/'));
      }
    }
  }
  return [...dependencies];
}

export async function annotatePublication(directory = 'dist') {
  const basePath = normalizeBasePath(process.env.BASE_PATH);
  for (const path of await htmlFiles(directory)) {
    const html = await readFile(path, 'utf8');
    const marker = html.match(/<!--PUBLICATION_DATES:([^>]+)-->/);
    if (!marker) throw new Error(`Missing publication source marker in ${path}.`);
    const source = decodeURIComponent(marker[1]).replace(/^\.\//, '');
    if (!source.startsWith('src/') || source.split('/').includes('..')) throw new Error('Invalid publication source path.');
    const dependencies = await pageDependencies(source, html, process.cwd(), basePath);
    const dates = gitDates(source, dependencies);
    await writeFile(path, html.replaceAll(marker[0], renderDates(dates)));
    console.log(`[dates] ${source}: first ${dates.firstPublished ?? 'uncommitted'}, updated ${dates.lastUpdated ?? 'uncommitted'}`);
  }
}
