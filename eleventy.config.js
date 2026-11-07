import { workRss } from './scripts/rss.mjs';
import { readFileSync } from 'node:fs';
import { workPhoto, projectCard, selectFeatured, validateStories, currentWorkPhotos, imagePresentation } from './scripts/work-gallery.mjs';
import { renderFaqAnswer } from './scripts/faq-markdown.mjs';
import { renderContactMap } from './scripts/contact-map.mjs';
import { normalizeBasePath, applyBasePath } from './scripts/site-paths.mjs';
import site from './src/_data/site.json' with { type: 'json' };

export default function (eleventyConfig) {
  // Search metadata always identifies the production URL, including in local previews.
  eleventyConfig.addFilter('absoluteUrl', path => new URL(path, `${site.url}/`).href);
  const images = JSON.parse(readFileSync('assets/images.json', 'utf8'));
  const currentWork = JSON.parse(readFileSync('src/_data/currentWork.json', 'utf8'));
  eleventyConfig.addGlobalData('currentWorkPhotos', currentWorkPhotos(images, currentWork));
  const featured = JSON.parse(readFileSync('src/_data/featuredWork.json', 'utf8'));
  eleventyConfig.addFilter('workRss', async (projects, site) => workRss(projects, images, site));
  eleventyConfig.addFilter('imagePresentation', imagePresentation);
  eleventyConfig.addFilter('workPhoto', entry => workPhoto(entry, images));
  eleventyConfig.addFilter('projectCard', project => projectCard(project, images));
  eleventyConfig.addFilter('faqMarkdown', renderFaqAnswer);
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  eleventyConfig.addShortcode('contactMap', () => renderContactMap(process.env.GOOGLE_MAPS_STATIC_API_KEY));
  eleventyConfig.addCollection('pieces', api => api.getFilteredByTag('pieces')
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)));
  eleventyConfig.addCollection('workStories', api => validateStories(api.getFilteredByTag('pieces'), api.getFilteredByTag('workStories')));
  eleventyConfig.addCollection('featuredWork', api => selectFeatured(featured, api.getFilteredByTag('pieces'), images));
  eleventyConfig.addTransform('basePath', function (content) {
    if (typeof this.page.outputPath !== 'string' || !this.page.outputPath.endsWith('.html')) return content;
    const marked = content.replaceAll('<!--PUBLICATION_DATES-->', `<!--PUBLICATION_DATES:${encodeURIComponent(this.page.inputPath)}-->`);
    return applyBasePath(marked, normalizeBasePath(process.env.BASE_PATH));
  });
  return {
    dir: { input: 'src', output: 'dist', includes: '_includes', data: '_data' },
    templateFormats: ['njk', 'md'],
    markdownTemplateEngine: false,
  };
}
