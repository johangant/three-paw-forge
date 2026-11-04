import { mkdir, rm, cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { renderContactMap } from './contact-map.mjs';
import { normalizeBasePath, applyBasePath } from './site-paths.mjs';

try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }

async function copyPages(directory = 'src', basePath = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await copyPages(source, basePath);
    else if (entry.name.endsWith('.html')) {
      const destination = source.replace(/^src\//, 'dist/');
      await mkdir(destination.slice(0, destination.lastIndexOf('/')), { recursive: true });
      const html = await readFile(source, 'utf8');
      const rendered = html.replace('<!--CONTACT_MAP-->', renderContactMap(process.env.GOOGLE_MAPS_STATIC_API_KEY));
      await writeFile(destination, applyBasePath(rendered, basePath));
    }
  }
}

export async function build() {
  await rm('dist', { recursive: true, force: true });
  await mkdir('dist', { recursive: true });
  await copyPages('src', normalizeBasePath(process.env.BASE_PATH));
  await cp('public', 'dist', { recursive: true });
  await writeFile('dist/.nojekyll', '');
  execFileSync(process.execPath, ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', 'src/styles.css', '-o', 'dist/styles.css', '--minify'], { stdio: 'inherit' });
}

if (import.meta.url === `file://${process.argv[1]}`) await build();
