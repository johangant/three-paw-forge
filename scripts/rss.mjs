import { gitDates, pageDependencies } from './publication.mjs';
import { workPhoto } from './work-gallery.mjs';

export function escapeXml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function feedBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol === 'http:') url.protocol = 'https:';
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('RSS requires a public HTTP(S) site URL.');
  url.search = ''; url.hash = '';
  return url.href.replace(/\/$/, '') + '/';
}

export function renderRss(entries, site, baseUrl) {
  const absolute = path => new URL(path.replace(/^\//, ''), baseUrl).href;
  const ordered = [...entries].sort((a, b) => (Date.parse(b.updated || '') || 0) - (Date.parse(a.updated || '') || 0) || a.url.localeCompare(b.url));
  const latest = ordered.find(entry => entry.updated)?.updated;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(site.name)} — From the workshop</title>
<link>${escapeXml(absolute('/work/'))}</link>
<description>Work galleries, finished pieces and workshop experiments from ${escapeXml(site.name)}.</description>
<language>en-gb</language>
<atom:link href="${escapeXml(absolute('/feed.xml'))}" rel="self" type="application/rss+xml"/>
${latest ? `<lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : ''}
${ordered.map(entry => {
    const url = absolute(entry.url);
    const description = `<p>${escapeXml(entry.summary)}</p><p><img src="${escapeXml(absolute(entry.image.src))}" alt="${escapeXml(entry.image.alt)}"></p><p>${escapeXml(entry.image.caption)}</p><p><a href="${escapeXml(url)}">Explore the gallery</a></p>`;
    return `<item>
<title>${escapeXml(entry.title)}</title>
<link>${escapeXml(url)}</link>
<guid isPermaLink="true">${escapeXml(url)}</guid>
${entry.updated ? `<pubDate>${new Date(entry.updated).toUTCString()}</pubDate>` : ''}
<description>${escapeXml(description)}</description>
</item>`;
  }).join('\n')}
</channel>
</rss>\n`;
}

export async function workRss(projects, manifest, site, siteUrl = process.env.SITE_URL || site.url) {
  const base = feedBaseUrl(siteUrl);
  const entries = [];
  for (const project of projects) {
    const cover = project.data.gallery.find(photo => photo.image === project.data.cover);
    if (!cover) throw new Error(`RSS cover missing for ${project.fileSlug}.`);
    const image = workPhoto(cover, manifest);
    const images = project.data.gallery.map(entry => workPhoto(entry, manifest));
    const assetMarkup = images.map(photo => `<img src="${photo.src}" srcset="${photo.srcset}"><source srcset="${photo.webpSrcset}">`).join('');
    const dependencies = await pageDependencies(project.inputPath, assetMarkup);
    const dates = gitDates(project.inputPath, dependencies);
    entries.push({ title: project.data.title, summary: project.data.summary, url: project.url, image, updated: dates.lastUpdated });
  }
  return renderRss(entries, site, base);
}
