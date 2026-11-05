# Three Paw Forge

A static metalcraft portfolio built with Eleventy, Nunjucks, Markdown and Tailwind CSS. Node.js 22.19 or newer is required (`.nvmrc` selects Node 24).

## Run locally

```sh
npm ci
npm run dev
```

Visit http://localhost:4173 (or set `PORT` to use another port). Edits in `src/`, `public/`, `scripts/`, and the Eleventy configuration rebuild the site and reload connected browser tabs. Restart the development server after changing `.env`, dependencies, or the build/server scripts.

`npm run build` generates HTML with Eleventy, copies public assets, and compiles minified Tailwind CSS into `dist/`. `npm run preview` serves an existing build without watching or live reload. `npm run audit` runs Lighthouse against the preview server.

## Licence

Website code and technical documentation are licensed under [MIT](LICENSE). Photographs, portfolio text and Three Paw Forge branding are reserved to Johan Gant; see [CONTENT-LICENSE.md](CONTENT-LICENSE.md).
