export function imagePresentation(entry) {
  const fit = entry.fit ?? 'cover';
  if (!['cover', 'contain'].includes(fit)) throw new Error(`Image ${entry.image ?? entry.src} fit must be cover or contain.`);
  const focalPoint = entry.focalPoint ?? '50% 50%';
  const match = typeof focalPoint === 'string' && focalPoint.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match || match.slice(1).some(value => Number(value) > 100)) throw new Error(`Image ${entry.image ?? entry.src} focalPoint must contain two percentages from 0% to 100%.`);
  return { ...entry, fit, focalPoint: `${Number(match[1])}% ${Number(match[2])}%` };
}

export function workPhoto(entry, manifest) {
  const asset = manifest[entry.image];
  if (!asset) throw new Error(`Unknown work image "${entry.image}". Run the image converter for the work group.`);
  if (!entry.alt?.trim() || !entry.caption?.trim()) throw new Error(`Work image ${entry.image} needs alt text and a caption.`);
  const width = Math.max(...asset.widths);
  return {
    ...imagePresentation(entry),
    src: `/images/${entry.image}-${width}.jpg`,
    srcset: asset.widths.map(size => `/images/${entry.image}-${size}.jpg ${size}w`).join(', '),
    webpSrcset: asset.widths.map(size => `/images/${entry.image}-${size}.webp ${size}w`).join(', '),
    width,
    height: Math.round(asset.height * width / asset.width),
  };
}

export function projectCard(project, manifest) {
  const entry = project.data.gallery.find(photo => photo.image === project.data.cover);
  if (!entry) throw new Error(`Cover image is missing from ${project.fileSlug}'s gallery.`);
  return { title: project.data.title, url: project.url, image: workPhoto(entry, manifest), description: project.data.summary };
}

export function selectFeatured(selections, projects, manifest) {
  return selections.map(selection => {
    const project = projects.find(item => item.fileSlug === selection.project);
    if (!project) throw new Error(`Unknown featured project "${selection.project}".`);
    const entry = project.data.gallery.find(photo => photo.image === selection.image);
    if (!entry) throw new Error(`Featured image "${selection.image}" is not in ${selection.project}'s gallery.`);
    return { title: selection.title || project.data.title, url: project.url, image: workPhoto({ ...entry, ...(selection.fit !== undefined ? { fit: selection.fit } : {}), ...(selection.focalPoint !== undefined ? { focalPoint: selection.focalPoint } : {}) }, manifest), description: selection.caption || entry.caption };
  });
}

export function validateStories(projects, stories) {
  const projectNames = new Set(projects.map(project => project.fileSlug));
  const routes = new Set(stories.map(story => story.url));
  for (const story of stories) {
    if (!projectNames.has(story.data.project)) throw new Error(`Unknown parent project "${story.data.project}" for story ${story.fileSlug}.`);
    if (!story.data.title || !story.data.description) throw new Error(`Story ${story.fileSlug} needs a title and description.`);
  }
  for (const project of projects) {
    for (const photo of project.data.gallery) {
      if (photo.story && !routes.has(photo.story)) throw new Error(`Story link "${photo.story}" in ${project.fileSlug} has no matching story page.`);
    }
  }
  return stories;
}

// Include WIP photos automatically and allow existing gallery images to be selected.
export function currentWorkPhotos(manifest, content) {
  return [...new Set([...Object.keys(manifest).filter(image => image.startsWith('work/wip/')), ...Object.keys(content.images ?? {}).filter(image => !image.startsWith('work/wip/'))])]
    .filter(image => !content.images?.[image]?.hidden)
    .sort((a, b) => ((content.images?.[a]?.order ?? 0) - (content.images?.[b]?.order ?? 0)) || a.localeCompare(b))
    .map(image => workPhoto({
      image,
      alt: 'A project currently being worked on at Three Paw Forge',
      caption: 'Work in progress.',
      ...content.images?.[image],
    }, manifest));
}
