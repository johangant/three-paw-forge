import test from 'node:test';
import assert from 'node:assert/strict';
import { workPhoto, projectCard, selectFeatured, validateStories, currentWorkPhotos, imagePresentation } from '../scripts/work-gallery.mjs';

const manifest = {
  'work/spoons/one': { width: 2400, height: 3200, widths: [320, 640, 1280, 1600] },
  'work/spoons/two': { width: 800, height: 600, widths: [320, 640, 800] },
  'work/bells/one': { width: 1600, height: 1200, widths: [320, 640, 1280, 1600] },
};
const projects = [
  { fileSlug: 'spoons', url: '/work/spoons/', data: { title: 'Spoons', summary: 'Project summary', cover: 'work/spoons/one', gallery: [
    { image: 'work/spoons/one', alt: 'First spoon', caption: 'First caption' },
    { image: 'work/spoons/two', alt: 'Second spoon', caption: 'Second caption' },
  ] } },
  { fileSlug: 'bells', url: '/work/bells/', data: { title: 'Bells', summary: 'Bell summary', cover: 'work/bells/one', gallery: [
    { image: 'work/bells/one', alt: 'Bell', caption: 'Bell caption' },
  ] } },
];

test('work images resolve namespaced URLs, responsive formats and resized dimensions', () => {
  const photo = workPhoto(projects[0].data.gallery[0], manifest);
  assert.equal(photo.src, '/images/work/spoons/one-1600.jpg');
  assert.equal(photo.width, 1600);
  assert.equal(photo.height, 2133);
  assert.match(photo.webpSrcset, /one-640.webp 640w/);
  assert.equal(projectCard(projects[0], manifest).url, '/work/spoons/');
});
test('homepage selects only requested images, preserves order and supports multiple images per project', () => {
  const selections = [
    { project: 'spoons', image: 'work/spoons/two' },
    { project: 'bells', image: 'work/bells/one', title: 'A special bell', caption: 'Homepage caption' },
    { project: 'spoons', image: 'work/spoons/one' },
  ];
  const cards = selectFeatured(selections, projects, manifest);
  assert.deepEqual(cards.map(card => card.image.image), selections.map(item => item.image));
  assert.equal(cards[0].description, 'Second caption');
  assert.equal(cards[1].title, 'A special bell');
  assert.equal(cards[1].description, 'Homepage caption');
  assert.equal(projects[1].data.gallery[0].caption, 'Bell caption');
  assert.equal(selectFeatured([selections[0]], projects, manifest).length, 1);
  assert.deepEqual(selectFeatured([], projects, manifest), []);
});
test('invalid selections, missing images and missing accessible descriptions fail clearly', () => {
  assert.throws(() => selectFeatured([{ project: 'unknown', image: 'work/spoons/one' }], projects, manifest), /Unknown featured project/);
  assert.throws(() => selectFeatured([{ project: 'spoons', image: 'work/bells/one' }], projects, manifest), /not in spoons/);
  assert.throws(() => workPhoto({ image: 'missing' }, manifest), /Unknown work image/);
  assert.throws(() => workPhoto({ image: 'work/spoons/one', caption: 'Caption' }, manifest), /alt text/);
  assert.throws(() => projectCard({ ...projects[0], data: { ...projects[0].data, cover: 'missing' } }, manifest), /Cover image/);
});


test('stories are optional and links resolve to a story with a known parent project', () => {
  assert.deepEqual(validateStories(projects, []), []);
  const story = { fileSlug: 'spoon-story', url: '/work/spoons/story/', data: { project: 'spoons', title: 'A spoon', description: 'The story' } };
  const withStory = structuredClone(projects);
  withStory[0].data.gallery[0].story = story.url;
  assert.deepEqual(validateStories(withStory, [story]), [story]);
  assert.equal(selectFeatured([{ project: 'spoons', image: 'work/spoons/one' }], withStory, manifest)[0].image.story, story.url);
  assert.throws(() => validateStories(withStory, []), /no matching story/);
  assert.throws(() => validateStories(projects, [{ ...story, data: { ...story.data, project: 'missing' } }]), /Unknown parent/);
});


test('WIP photos are drawn automatically from the reserved directory with captions, order and hiding', () => {
  const assets = { ...manifest,
    'work/wip/one': manifest['work/spoons/one'],
    'work/wip/two': manifest['work/spoons/two'],
    'work/wip/hidden': manifest['work/bells/one'],
  };
  const content = { images: {
    'work/wip/two': { caption: 'Second project', alt: 'Second photo', order: -1 },
    'work/wip/hidden': { hidden: true },
  } };
  const photos = currentWorkPhotos(assets, content);
  assert.deepEqual(photos.map(photo => photo.image), ['work/wip/two', 'work/wip/one']);
  assert.equal(photos[0].caption, 'Second project');
  assert.equal(photos[1].caption, 'Work in progress.');
  assert.deepEqual(currentWorkPhotos(manifest, content), []);
  assert.equal(currentWorkPhotos({ ...manifest, 'work/wip/two': assets['work/wip/two'] }, content).length, 1);
});

test('current work can select existing gallery images after WIP photos and rejects missing selections', () => {
  const assets = { ...manifest, 'work/wip/one': manifest['work/spoons/one'] };
  const content = { images: {
    'work/wip/one': { order: 1 },
    'work/spoons/one': { alt: 'Existing project photo', caption: 'Still in progress', order: 2, fit: 'contain' },
  } };
  const photos = currentWorkPhotos(assets, content);
  assert.deepEqual(photos.map(photo => photo.image), ['work/wip/one', 'work/spoons/one']);
  assert.equal(photos[1].caption, 'Still in progress');
  assert.equal(photos[1].fit, 'contain');
  assert.throws(() => currentWorkPhotos(assets, { images: { 'work/missing/photo': {} } }), /Unknown work image/);
});


test('framing settings are validated and homepage overrides do not alter gallery images', () => {
  assert.equal(imagePresentation({}).fit, 'cover');
  assert.equal(imagePresentation({}).focalPoint, '50% 50%');
  assert.equal(imagePresentation({ fit: 'contain', focalPoint: '25% 35.5%' }).focalPoint, '25% 35.5%');
  assert.throws(() => imagePresentation({ fit: 'stretch' }), /fit must/);
  assert.throws(() => imagePresentation({ focalPoint: '101% 40%' }), /percentages/);
  assert.throws(() => imagePresentation({ focalPoint: '50% 50%; color:red' }), /percentages/);
  const edited = structuredClone(projects);
  edited[0].data.gallery[0].fit = 'contain';
  const inherited = selectFeatured([{ project: 'spoons', image: 'work/spoons/one' }], edited, manifest)[0];
  assert.equal(inherited.image.fit, 'contain');
  const overridden = selectFeatured([{ project: 'spoons', image: 'work/spoons/one', fit: 'cover', focalPoint: '50% 20%' }], edited, manifest)[0];
  assert.equal(overridden.image.fit, 'cover');
  assert.equal(overridden.image.focalPoint, '50% 20%');
  assert.equal(edited[0].data.gallery[0].fit, 'contain');
});
