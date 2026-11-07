import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRss, feedBaseUrl } from '../scripts/rss.mjs';
const image = { src: '/images/test.jpg', alt: 'Metal & copper', caption: 'Details <up close>' };

test('RSS has absolute URLs, stable identifiers, images, escaped text and newest-first dates', () => {
  const xml = renderRss([
    { title: 'Older', summary: 'Old', url: '/work/old/', image, updated: '2026-09-08T12:00:00Z' },
    { title: 'New & shiny', summary: 'Text <with> & characters', url: '/work/new/', image, updated: '2026-11-05T12:00:00Z' },
  ], { name: 'Three Paw Forge' }, feedBaseUrl('http://example.com/project/'));
  assert.ok(xml.indexOf('<title>New &amp; shiny</title>') < xml.indexOf('<title>Older</title>'));
  assert.match(xml, /<guid isPermaLink="true">https:\/\/example.com\/project\/work\/new\/<\/guid>/);
  assert.match(xml, /https:\/\/example.com\/project\/images\/test.jpg/);
  assert.match(xml, /Thu, 05 Nov 2026 12:00:00 GMT/);
  assert.match(xml, /&lt;p&gt;Text &amp;lt;with&amp;gt; &amp;amp; characters/);
});
test('uncommitted feed items have no fabricated date', () => {
  const xml = renderRss([{ title: 'New', summary: 'New', url: '/work/new/', image, updated: null }], { name: 'Forge' }, feedBaseUrl('https://example.com'));
  assert.ok(!xml.includes('<pubDate>'));
  assert.ok(!xml.includes('<lastBuildDate>'));
});
