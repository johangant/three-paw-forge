# Three Paw Forge

A static metalcraft portfolio built with Eleventy, Nunjucks, Markdown and Tailwind CSS. Node.js 22.19 or newer is required (`.nvmrc` selects Node 24).

## Run locally

```sh
npm ci
npm run dev
```

Visit http://localhost:4173 (or set `PORT` to use another port). Edits in `src/`, `public/`, `scripts/`, and the Eleventy configuration rebuild the site and reload connected browser tabs. Restart the development server after changing `.env`, dependencies, or the build/server scripts.

`npm run build` generates HTML with Eleventy, copies public assets, and compiles minified Tailwind CSS into `dist/`. `npm run preview` serves an existing build without watching or live reload. `npm run audit` runs Lighthouse against the preview server.

## Edit content

- **Portfolio:** edit or add a Markdown file under `src/pieces/`. Its front matter provides the title, image metadata, display order and homepage visibility. The Markdown body provides the card description. Both the homepage and `/work/` render these entries from one source.
- **Homepage:** `src/index.njk` assembles the hero, featured work, and maker sections from `src/_includes/sections/`. Edit or reorder those includes to change the page.
- **Patch:** edit the biography in `src/about/patch/index.md`. Its `portrait` and `gallery` front matter control the photographs, alternative text and captions. Add a gallery list entry for each new photo; the reusable layout and photo include handle the markup. `caption` is the visible text beneath the image and in the lightbox; `alt` describes the photograph for people who cannot see it. Keep both as plain text. This page is linked from About, outside the main navigation.
- **Other pages:** edit `src/about/index.njk`, `src/work/index.njk`, or `src/contact/index.njk`. YAML front matter controls each page's title, meta description, layout and output URL. Page bodies retain HTML where the design needs it.
- **Shared details:** `src/_data/site.json` holds the site name, contact email, and navigation.
- **Shared markup:** `src/_includes/layouts/base.njk` assembles the document head, header, main content and footer. `src/_includes/work-card.njk` controls all portfolio cards.
- **Images:** put published assets in `public/images/`. Existing source photography and the image optimisation script remain under `assets/source/` and `scripts/optimise-images.py`.

For example, add `src/pieces/new-piece.md`:

```markdown
---
title: A new piece
order: 4
featured: true
image:
  src: /images/new-piece-640.jpg
  srcset: /images/new-piece-320.jpg 320w, /images/new-piece-640.jpg 640w
  width: 640
  height: 720
  alt: Describe the actual photograph
---
A short description of the piece. **Markdown is supported.**
```

Add the referenced images before building. Use unique numeric `order` values for predictable ordering. Set `featured: false` to show a piece only on `/work/`. Entries inherit `tags: pieces` and `permalink: false` from `src/pieces/pieces.json`: they supply content to the cards and do not generate individual detail pages. Cards continue to link to their full photographs. All pieces marked `featured: true` appear on the homepage; there is no automatic homepage limit.

To add a page, create a `.njk` file under `src/` with front matter:

```yaml
---
layout: layouts/base.njk
title: Page title — Three Paw Forge
description: A short description for search results.
permalink: /page-name/
---
```

Follow it with the page's HTML and any Nunjucks includes. Add its link to `site.json` if it belongs in the main navigation. The header sets the current-page state automatically. Markdown pages can use the same base layout, but need a suitable wrapper/layout for typography and spacing.

## Patch gallery photos and lightbox

1. Add original JPEG or HEIC photos to `assets/source/`.
2. Run `python3 scripts/optimise-images.py` (requires Pillow; HEIC also requires `heif-convert` from libheif tools). This generates progressive JPEG and WebP variants at up to 320, 640, 1280 and 1600 pixels wide without upscaling. Originals remain untouched; published copies have metadata removed. `assets/images.json` records the original dimensions and generated widths.
3. Add an entry under `gallery:` in `src/about/patch/index.md`, in the order you want the photographs to appear:

```yaml
  - src: /images/my-photo-1600.jpg
    srcset: /images/my-photo-320.jpg 320w, /images/my-photo-640.jpg 640w, /images/my-photo-1280.jpg 1280w, /images/my-photo-1600.jpg 1600w
    webpSrcset: /images/my-photo-320.webp 320w, /images/my-photo-640.webp 640w, /images/my-photo-1280.webp 1280w, /images/my-photo-1600.webp 1600w
    width: 1600
    height: 1200
    alt: Patch sleeping on a garden chair
    caption: "A well-earned afternoon off."
```

Use the actual generated filenames, widths, and height; small originals produce fewer sizes. Quote captions containing a colon. You can change captions, alternative text and ordering without regenerating photographs.

Thumbnails use WebP where supported and JPEG otherwise. Selecting a photograph opens the native modal dialog, with its caption, photograph count, previous/next buttons, and a direct-image link. Left/right arrows browse; Home/End select the first/last photograph; Escape or Close dismisses it and returns focus to the opening thumbnail. JavaScript is loaded only on Patch’s page. Without JavaScript or modal-dialog support, gallery links still open the JPEG directly. No external gallery library is used.

## FAQ and publication dates

The FAQ has its own page at `/faq/`, linked from the main navigation. Edit the questions, answers and optional links in `src/_data/faq.json`; its markup lives in `src/_includes/sections/faq.njk`. Answers support Markdown links such as `[Nigel Barnett](http://www.artist-blacksmith.co.uk)` and `[Meet Patch](/about/patch/)`. Plain URLs and email addresses are linked automatically, so existing answers work without rewriting them. Raw HTML is displayed as text. The optional `url` and `linkLabel` fields still provide a separate link after an answer.

Each footer shows **First published** and **Last updated** as quiet, page-specific metadata. The build adds semantic `<time>` elements when dates are known. Dates use the Europe/London calendar day of the publishing build; they become public with its Pages deployment, not on a local edit, commit or build. They are release dates, not precise deployment-completion timestamps.

The Pages workflow sets `PUBLICATION_MODE=publish` and supplies the configured site URL. HTTP URLs reported by Pages are upgraded to HTTPS before the publication registry is fetched, preserving any project path. The build reads `publication.json` from the current live site, compares each page's rendered HTML and its referenced local images, styles, scripts and icons, and carries unchanged dates forward. Changed pages receive the new release date; previously unseen pages receive their first publication date too. Shared header/footer/style changes can therefore update several pages. The new registry travels inside the same artifact as the HTML: a failed build or failed deployment does not update the live dates. No repository commits, CMS or separate writable service are needed. Network errors or invalid registry data fail the publishing build rather than silently reset history.

Historical publication dates cannot be reconstructed reliably from Git commit dates. The existing five pages are registered in `assets/publication-history.json` with unknown dates, displayed as “not recorded”. Replace those null values only with confirmed publication dates in `YYYY-MM-DD` form. On the first deployment with tracking, last-updated dates are established; unknown historical first-publication dates remain unknown. The build also checks whether an unregistered page already exists before assigning a first-publication date when adopting tracking.

Local builds never advance dates and never contact the live site. They use a copy of the deployed registry at `.cache/publication.json` if present, otherwise the tracked historical seeds. To preview known live dates, download the site's `/publication.json` to that ignored cache file first; do not cache the registry from a local build as publication evidence. Without a live copy, local previews may show “not recorded” even after the live site has dates. For a controlled release, `PUBLICATION_DATE=YYYY-MM-DD` can override the default release day; dates earlier than recorded history are rejected.

`npm test` checks publication tracking, added/changed/unchanged pages, changed assets, unknown history, URL normalization, failure behaviour, and FAQ link rendering. Publishing builds log each page as Added, Updated or Unchanged with its dates. The hosting workflow runs these checks before building.

## Hosting and contact map

The output remains static files, with the existing `/`, `/work/`, `/about/`, and `/contact/` URLs. No CMS, database, or browser framework is required. GitHub Pages continues to run `npm ci` and `npm run build`; the workflow publishes pushes to `main`.

Set `BASE_PATH=/three-paw-forge` at build time for repository-subpath hosting. Leave it empty for a domain root. Templates use root-relative URLs; a final Eleventy transform prefixes local `href`, `src`, and `srcset` values. Preview a prefixed build on a host mounted at that prefix; the bundled preview server serves the output at its root.

The `{% contactMap %}` shortcode retains the existing map renderer. Without `GOOGLE_MAPS_STATIC_API_KEY`, it emits a Google Maps link. With a key, it emits a static map image. Copy `.env.example` to `.env` for local configuration. The static-map key is browser-visible and must be restricted as described in that example. No map API is called during the build.

## Licence

Website code and technical documentation are licensed under [MIT](LICENSE). Photographs, portfolio text and Three Paw Forge branding are reserved to Johan Gant; see [CONTENT-LICENSE.md](CONTENT-LICENSE.md).
