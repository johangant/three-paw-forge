import test from 'node:test';
import assert from 'node:assert/strict';
import { renderFaqAnswer } from '../scripts/faq-markdown.mjs';

test('FAQ answers support labelled links, internal links, bare URLs and email addresses', () => {
  const result = renderFaqAnswer('See [my tools](https://example.com/tools), [Patch](/about/patch/), https://example.org and workshop@threepawforge.co.uk.');
  assert.match(result, /<a href="https:\/\/example.com\/tools">my tools<\/a>/);
  assert.match(result, /<a href="\/about\/patch\/">Patch<\/a>/);
  assert.match(result, /<a href="https:\/\/example.org">https:\/\/example.org<\/a>/);
  assert.match(result, /href="mailto:workshop@threepawforge.co.uk"/);
});
test('FAQ answers escape raw HTML and reject executable links', () => {
  const result = renderFaqAnswer('<script>alert(1)</script> [unsafe](javascript:alert%281%29)');
  assert.ok(!result.includes('<script>'));
  assert.ok(!result.includes('href="javascript:'));
  assert.match(result, /&lt;script&gt;/);
});
