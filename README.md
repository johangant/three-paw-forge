# Three Paw Forge

A static metalcraft portfolio built with Eleventy, Nunjucks, Markdown and Tailwind CSS. Node.js 22.19 or newer is required (`.nvmrc` selects Node 24).

## Run locally

```sh
npm ci
npm run dev
```

Visit http://localhost:4173 (or set `PORT` to use another port). Edits in `src/`, `public/`, `scripts/`, and the Eleventy configuration rebuild the site and reload connected browser tabs. Restart the development server after changing `.env`, dependencies, or the build/server scripts.

`npm run build` generates HTML with Eleventy, copies public assets, and compiles minified Tailwind CSS into `dist/`. `npm run preview` serves an existing build without watching or live reload. `npm run audit` runs Lighthouse against the preview server.

## Edit work galleries

See [the work gallery guide](docs/work-galleries.md) for project pages, image conversion, captions and selecting individual photographs for the homepage.

## RSS feed

Subscribe at `/feed.xml`, linked from each footer and advertised in page metadata. The RSS 2.0 feed contains work project galleries, with descriptions, cover photographs, stable gallery URLs, and Git-derived update dates, newest first. WIP, Patch and optional individual story pages are excluded. A changed gallery updates its existing feed item rather than creating another item for the same URL. Uncommitted new project files have no invented publication date in local previews.

The canonical URL defaults to `url` in `src/_data/site.json`. GitHub Pages supplies `SITE_URL` from its configured base URL, including a repository subpath where applicable. For a custom local build, set `SITE_URL=https://example.com/project`; feed links and images will use that full base URL. No publication registry or network requests are needed.

## Sitemap

Each build generates `dist/sitemap.xml` from the actual public HTML pages and writes the matching `robots.txt`. This includes Patch, work galleries and any story pages you add; WIP has no standalone page to include. RSS, media assets and unpublished templates are excluded. Pages explicitly marked with a robots `noindex` meta tag are omitted. Git-derived last-updated timestamps supply `<lastmod>` where known; uncommitted new pages have no invented date. URLs use the same canonical `site.url` / `SITE_URL` setting as RSS. There is no hand-maintained sitemap list.

## Licence

Website code and technical documentation are licensed under [MIT](LICENSE). Photographs, portfolio text and Three Paw Forge branding are reserved to Johan Gant; see [CONTENT-LICENSE.md](CONTENT-LICENSE.md).
