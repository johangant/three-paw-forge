# Work galleries

Original photographs live in `assets/source/work/<project>/`. The folder names are preserved in published image paths, so two projects can use the same camera filename without overwriting each other. Patch’s moved photographs stay under `assets/source/patch/`, and their published URLs are unchanged.

## Convert photographs

```sh
python3 scripts/optimise-images.py --group work
```

This generates responsive JPEG and WebP copies under `public/images/work/`, removes metadata and caps widths at 1600px. Originals remain untouched. `--group patch` converts Patch’s folder; omit the option to regenerate everything. HEIC requires `heif-convert`; JPEG/WebP generation requires Pillow. Generated dimensions and available widths are recorded in `assets/images.json`.

The gallery is curated in content files: adding an original and running the converter does not automatically publish it in a gallery. Add its entry below when it is ready.

## Edit a project

Each project has a Markdown file in `src/pieces/`. Its `permalink` sets the URL: `spoons.md` uses `/work/spoons/`. The Markdown body is the introduction. Front matter controls the title, summary, listing order, cover photograph, gallery, captions and alternative text:

```yaml
---
title: Spoons
permalink: /work/spoons/
description: Copper bowls and twisted handles.
summary: Copper bowls and twisted handles.
order: 1
cover: work/spoons/copper-spoon
gallery:
  - image: work/spoons/copper-spoon
    alt: Copper spoon with a twisted dark handle on a wooden surface
    caption: "A copper bowl, a twisted handle, and a curled finish."
  - image: work/spoons/IMG_4045
    alt: Copper spoon in a wooden presentation box
    caption: Ready in its presentation box.
---
An introduction to this project, written in **Markdown**.
```

An image ID is its path relative to `assets/source/`, without the extension. Reorder entries to reorder photographs. The `cover` must name one of the gallery images. Captions appear below thumbnails and in the lightbox; `alt` describes the photograph for people who cannot see it. Quote text containing a colon.

Each gallery uses the same 4:3 thumbnail crops and keyboard-accessible viewer as Patch’s. The viewer shows the full uncropped photograph. The project index at `/work/` links to each gallery, ordered by `order`. Keep numbers unique for predictable ordering.

## Choose homepage features

Edit `src/_data/featuredWork.json`. Only entries in this list appear in the homepage portfolio section, in the order listed:

```json
[
  {
    "project": "spoons",
    "image": "work/spoons/IMG_4045",
    "title": "A spoon, ready to give",
    "caption": "An optional homepage-only caption."
  },
  {
    "project": "bells",
    "image": "work/bells/IMG_2483"
  }
]
```

`project` is the Markdown filename without `.md`. `image` must belong to that project’s gallery. `title` defaults to the project title; `caption` defaults to that photograph’s caption. You can select several images from the same project, change the order or remove entries without affecting the galleries. No new work is featured automatically. Three selections make one desktop row; additional selections create further rows. Each feature links to its project gallery.

The build rejects unknown projects, missing converted images, invalid cover/feature selections, or gallery images without captions and alternative text. Run `npm test` and `npm run build` before publishing. The build automatically includes new gallery pages in the sitemap.

## Optional stories for individual pieces

A project-type gallery can contain several different pieces. Add a story page only for the pieces you want to document; galleries and homepage selection work without stories.

1. Copy `docs/templates/work-story.md` to `src/stories/copper-spoon.md` (choose your own filename). The template stays outside the site until copied, so its instructions are never published.
2. Set `project` to the parent gallery filename, such as `spoons`. Set a unique `permalink`, such as `/work/spoons/copper-spoon/`, plus your title and description.
3. Replace the example paragraphs with the piece’s story. Ordinary Markdown paragraphs and links are supported.
4. Add any number of captioned photographs to its `gallery` array using the same image IDs, `alt` and `caption` fields as the work galleries. Each opens in the shared accessible lightbox. Omit the gallery or use `gallery: []` for a text-only story.
5. In the parent gallery’s image entry, add a `story` link:

```yaml
  - image: work/spoons/copper-spoon
    alt: Copper spoon with a twisted handle on a wooden surface
    caption: The finished spoon.
    story: /work/spoons/copper-spoon/
    storyLabel: How this spoon came together
```

`storyLabel` is optional. The story link appears beneath the image’s caption, separately from the photograph link that opens the lightbox. You can link several photographs to the same story. Features selected from those images also receive a story link beneath their homepage card; the main card still leads to the project gallery.

Story pages inherit their layout from `src/stories/stories.json`; `src/_includes/layouts/work-story.njk` controls the shared design. They link back to the parent gallery and display Git-derived footer dates. Published story pages are included in the generated sitemap automatically.

## What I’m currently working on

`assets/source/work/wip/` is reserved for the homepage’s “What I’m currently working on” section. It does not create a project page, appear in `/work/`, or participate in homepage portfolio selections.

Add or remove originals there and run `python3 scripts/optimise-images.py --group work`. Every converted image still in that folder appears automatically in the current-work section; removing one and reconverting removes it from the section. Published files are not deleted by the converter. To move finished work into the portfolio, move its original to the appropriate project folder, reconvert, then add its entry to that project’s content file.

Edit the introduction and image captions in `src/_data/currentWork.json`:

```json
{
  "intro": "A few things taking shape on the workbench.",
  "images": {
    "work/wip/IMG_4315": {
      "alt": "Metal spider with curved legs against wooden boards",
      "caption": "Trying out the shape of the legs.",
      "order": 1
    }
  }
}
```

Image IDs match the source paths without extensions. `order` is optional; otherwise images sort by filename. Set `hidden: true` on an image entry to hide it without moving its original. Uncaptioned new photos use generic fallback text until you add specific captions and alternative text. The section and its lightbox disappear if no visible WIP images remain.

## Thumbnail framing

Gallery entries support `fit: contain` to show an entire photograph, or `fit: cover` with `focalPoint: "50% 35%"` to choose the crop alignment. Covers and homepage features inherit those settings; homepage selection entries can override them independently. Frames stay 4:3, and lightbox images stay uncropped. See [the framing review](image-focal-points.md) for the two images needing your judgement and examples of how to communicate a focal point.
