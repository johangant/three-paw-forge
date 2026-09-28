# Three Paw Forge

A small static metalcraft portfolio built with Tailwind CSS. Node.js 22.19 or newer is required (Node.js 24 LTS recommended). No client-side JavaScript, remote fonts, tracking, or runtime framework.

## Run locally

```sh
npm install
npm run dev
```

Visit http://localhost:4173. While `npm run dev` is running, edits in `src/` or `public/` rebuild the site and reload connected browser tabs automatically. `npm run build` compiles a minified stylesheet and copies the site to `dist/`. `npm run preview` serves an existing build without file watching or live reload.

## Personalise before publishing

- The homepage retains the portfolio, about and contact overview sections, with links to complementary pages for more detail.
- Edit `src/index.html` for the homepage, `src/work/index.html` for the portfolio, `src/about/index.html` for the biography and `src/contact/index.html` for contact details.
- Pages publish at `/`, `/work/`, `/about/` and `/contact/`. The build copies all source HTML pages. Keep the shared navigation and footer consistent when editing pages.
- Four real portfolio photographs are included; see `assets/SOURCES.md` for provenance and `scripts/optimise-images.py` for regeneration. Keep responsive sizes, image dimensions and alt text aligned when replacing photos. Lazy-load below-the-fold images only.
- Replace the contact placeholder with your chosen public email (`mailto:` link) or social profile. No invented address or nonfunctional form is included.
- Add the final canonical URL and social preview metadata once the domain is known. Add a sitemap and its robots.txt entry when final URLs exist.
- Deploy the contents of `dist/` to a static host with HTTPS, compression, suitable cache headers, and security headers.

## Lighthouse

With the preview server running, use `npm run audit`. This writes local HTML and JSON reports (ignored by Git). Target at least 95 in performance, accessibility, best practices, and SEO on mobile. Recheck after adding photographs and on the deployed HTTPS URL: local scores do not prove production performance.

The baseline uses semantic landmarks, a skip link, visible focus indicators, reduced-motion support, system fonts, fixed illustration aspect ratios, and compiled Tailwind. Automated accessibility checks still need keyboard and screen-reader review.

Tailwind installation reference: https://tailwindcss.com/docs/installation/tailwind-cli

## Verified local baseline

Lighthouse 13.4.1, mobile simulation, 8 September 2026: performance 100, accessibility 100, best practices 100, SEO 100. Largest contentful paint 0.9 seconds; cumulative layout shift 0; total blocking time 0 ms. These results apply to the illustration scaffold on localhost, before real photography and deployment. The local reports are `lighthouse-report.report.html` and `lighthouse-report.report.json`.

Dependency audit after updating Lighthouse: zero known vulnerabilities. The default Node 22.17 installation is too old for this Lighthouse release; the audit used the existing bundled Node 24 runtime. `.nvmrc` selects Node 24 for development.

## Photo portfolio verification

After adding the four gallery photographs on 8 September 2026, Lighthouse 13.4.1 mobile simulation again scored 100 for performance, accessibility, best practices and SEO. Largest contentful paint: 1.8 seconds; layout shift: 0; total blocking time: 0 ms; transferred resources: 304 KiB. This was measured before the later multi-page and JPEG changes; it is historical evidence, not a current measurement or deployment proof.

## Licence

Website code and technical documentation are licensed under [MIT](LICENSE). Photographs, portfolio text and Three Paw Forge branding are reserved to Johan Gant; see [CONTENT-LICENSE.md](CONTENT-LICENSE.md).
