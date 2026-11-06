import { renderFaqAnswer } from './scripts/faq-markdown.mjs';
import { renderContactMap } from './scripts/contact-map.mjs';
import { normalizeBasePath, applyBasePath } from './scripts/site-paths.mjs';
import site from './src/_data/site.json' with { type: 'json' };

export default function (eleventyConfig) {
  // Search metadata always identifies the production URL, including in local previews.
  eleventyConfig.addFilter('absoluteUrl', path => new URL(path, `${site.url}/`).href);
  eleventyConfig.addCollection('sitemapPages', api => api.getAll()
    .filter(item => typeof item.outputPath === 'string' && item.outputPath.endsWith('.html') && item.url)
    .sort((a, b) => a.url.localeCompare(b.url)));
  eleventyConfig.addFilter('faqMarkdown', renderFaqAnswer);
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  eleventyConfig.addShortcode('contactMap', () => renderContactMap(process.env.GOOGLE_MAPS_STATIC_API_KEY));
  eleventyConfig.addCollection('pieces', api => api.getFilteredByTag('pieces')
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)));
  eleventyConfig.addCollection('featuredPieces', api => api.getFilteredByTag('pieces')
    .filter(piece => piece.data.featured)
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)));
  eleventyConfig.addTransform('basePath', function (content) {
    if (typeof this.page.outputPath !== 'string' || !this.page.outputPath.endsWith('.html')) return content;
    const marked = content.replace('<!--PUBLICATION_DATES-->', `<!--PUBLICATION_DATES:${encodeURIComponent(this.page.inputPath)}-->`);
    return applyBasePath(marked, normalizeBasePath(process.env.BASE_PATH));
  });
  return {
    dir: { input: 'src', output: 'dist', includes: '_includes', data: '_data' },
    templateFormats: ['njk', 'md'],
    markdownTemplateEngine: false,
  };
}
