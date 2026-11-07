import { mkdir, rm, cp, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { writeSitemap } from './sitemap.mjs';
import { annotatePublication } from './publication.mjs';
import { versionAssetUrls } from './asset-versions.mjs';
import { normalizeBasePath } from './site-paths.mjs';

try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }

export async function build() {
  await rm('dist', { recursive: true, force: true });
  await mkdir('dist', { recursive: true });
  // A fresh process on each build avoids stale configuration, data, and template caches
  // when the development server rebuilds after an edit.
  execFileSync(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs'], { stdio: 'inherit' });
  await cp('public', 'dist', { recursive: true });
  await writeFile('dist/.nojekyll', '');
  execFileSync(process.execPath, ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', 'src/styles.css', '-o', 'dist/styles.css', '--minify'], { stdio: 'inherit' });
  await annotatePublication();
  await versionAssetUrls('dist', normalizeBasePath(process.env.BASE_PATH));
  const site = JSON.parse(await readFile('src/_data/site.json', 'utf8'));
  await writeSitemap('dist', process.env.SITE_URL || site.url);
}

if (import.meta.url === `file://${process.argv[1]}`) await build();
