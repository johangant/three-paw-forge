import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { normalizeBasePath } from './site-paths.mjs';

const marker = '<!--PUBLICATION_DATES-->';
const emptyHistory = () => ({ version: 1, pages: {} });
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validDate(value) {
  return typeof value === 'string' && datePattern.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validateHistory(history) {
  if (history?.version !== 1 || !history.pages || typeof history.pages !== 'object' || Array.isArray(history.pages)) {
    throw new Error('Invalid publication history; refusing to reset publication dates.');
  }
  for (const [url, record] of Object.entries(history.pages)) {
    if (!url.startsWith('/') || !url.endsWith('/') || !record || typeof record !== 'object') throw new Error('Invalid publication page record.');
    for (const key of ['firstPublished', 'lastUpdated']) {
      if (record[key] != null && !validDate(record[key])) throw new Error(`Invalid ${key} for ${url}.`);
    }
    if (record.firstPublished && record.lastUpdated && record.firstPublished > record.lastUpdated) throw new Error(`Publication dates out of order for ${url}.`);
    if (record.hash != null && !/^[a-f0-9]{64}$/.test(record.hash)) throw new Error(`Invalid content hash for ${url}.`);
  }
  return history;
}

export function publicationRecord(previous, seed, hash, releaseDate) {
  const firstPublished = previous?.firstPublished ?? seed?.firstPublished ?? null;
  if (!releaseDate) return { hash, firstPublished, lastUpdated: previous?.lastUpdated ?? seed?.lastUpdated ?? null };
  if (!validDate(releaseDate)) throw new Error('PUBLICATION_DATE must be a valid YYYY-MM-DD date.');
  if ([firstPublished, previous?.lastUpdated, seed?.lastUpdated].some(date => date && date > releaseDate)) {
    throw new Error('Release date precedes recorded publication history.');
  }
  if (previous?.hash === hash) return { ...previous, firstPublished };
  return {
    hash,
    firstPublished: previous || seed ? firstPublished : releaseDate,
    lastUpdated: releaseDate,
  };
}

export function renderDates(record) {
  const label = value => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }).format(new Date(`${value}T12:00:00Z`));
  const time = value => value ? `<time datetime="${value}">${label(value)}</time>` : 'not recorded';
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

// Hash rendered HTML plus locally referenced assets; dates themselves never enter the hash.
export async function pageHash(html, directory, basePath = '') {
  const root = resolve(directory);
  const urls = new Set();
  for (const match of html.matchAll(/\b(?:src|href|srcset)="([^"]*)"/g)) {
    for (const candidate of match[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (!url?.startsWith('/') || url.startsWith('//')) continue;
      const pathname = new URL(url, 'https://local.invalid').pathname;
      const local = basePath && pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;
      if (/\.(?:css|js|jpg|jpeg|png|webp|svg|avif|woff2?)$/i.test(local)) urls.add(decodeURIComponent(local));
    }
  }
  const hash = createHash('sha256').update(html);
  for (const url of [...urls].sort()) {
    const path = resolve(root, `.${url}`);
    if (!path.startsWith(root + sep)) throw new Error('Asset path escapes build directory.');
    hash.update(url).update(await readFile(path));
  }
  return hash.digest('hex');
}

async function readLocalHistory(path) {
  try { return validateHistory(JSON.parse(await readFile(path, 'utf8'))); }
  catch (error) { if (error.code === 'ENOENT') return emptyHistory(); throw error; }
}

async function publishedHistory(baseUrl) {
  const response = await fetch(`${baseUrl}/publication.json?release=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (response.status === 404) {
    console.warn('No published date registry found. Existing dates will remain unknown unless seeded.');
    return null;
  }
  if (!response.ok) throw new Error(`Cannot read published date registry (${response.status}); refusing to reset dates.`);
  return validateHistory(await response.json());
}

export async function annotatePublication(directory = 'dist') {
  const publishing = process.env.PUBLICATION_MODE === 'publish';
  const basePath = normalizeBasePath(process.env.BASE_PATH);
  const seed = await readLocalHistory('assets/publication-history.json');
  let history = await readLocalHistory('.cache/publication.json');
  let baseUrl;
  if (publishing) {
    if (!process.env.PUBLICATION_BASE_URL) throw new Error('Publishing requires PUBLICATION_BASE_URL.');
    baseUrl = new URL(process.env.PUBLICATION_BASE_URL);
    if (baseUrl.protocol !== 'https:') throw new Error('Publication URL must use HTTPS.');
    baseUrl = baseUrl.href.replace(/\/$/, '');
    history = await publishedHistory(baseUrl);
  }
  const releaseDate = publishing ? (process.env.PUBLICATION_DATE || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())) : null;
  if (releaseDate && !validDate(releaseDate)) throw new Error('Invalid release date.');
  const result = { version: 1, pages: { ...history?.pages } };
  for (const path of await htmlFiles(directory)) {
    const html = await readFile(path, 'utf8');
    if (!html.includes(marker)) throw new Error(`Missing publication marker in ${path}.`);
    const output = relative(resolve(directory), path).split(sep).join('/');
    const url = '/' + output.replace(/index\.html$/, '');
    let legacy = seed.pages[url];
    // During adoption (or if the registry disappears), never call an existing page newly published.
    if (publishing && !history && !legacy) {
      const response = await fetch(`${baseUrl}${url}`, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (response.ok) legacy = { firstPublished: null, lastUpdated: null };
      else if (response.status !== 404) throw new Error(`Cannot establish publication history for ${url} (${response.status}).`);
    }
    const hash = await pageHash(html, directory, basePath);
    const record = publicationRecord(history?.pages[url], legacy, hash, releaseDate);
    result.pages[url] = record;
    await writeFile(path, html.replace(marker, renderDates(record)));
  }
  // This registry travels in the same Pages artifact as the dated HTML. Failed deployments
  // do not replace the live registry, and local builds never advance its dates.
  await writeFile(resolve(directory, 'publication.json'), JSON.stringify(result, null, 2) + '\n');
}
