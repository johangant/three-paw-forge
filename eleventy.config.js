import { renderContactMap } from './scripts/contact-map.mjs';
import { normalizeBasePath, applyBasePath } from './scripts/site-paths.mjs';

export default function (eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  eleventyConfig.addShortcode('contactMap', () => renderContactMap(process.env.GOOGLE_MAPS_STATIC_API_KEY));
  eleventyConfig.addCollection('pieces', api => api.getFilteredByTag('pieces')
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)));
  eleventyConfig.addCollection('featuredPieces', api => api.getFilteredByTag('pieces')
    .filter(piece => piece.data.featured)
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)));
  eleventyConfig.addTransform('basePath', function (content) {
    return typeof this.page.outputPath === 'string' && this.page.outputPath.endsWith('.html')
      ? applyBasePath(content, normalizeBasePath(process.env.BASE_PATH))
      : content;
  });
  return {
    dir: { input: 'src', output: 'dist', includes: '_includes', data: '_data' },
    templateFormats: ['njk', 'md'],
    markdownTemplateEngine: false,
  };
}
