import { mkdir, rm, copyFile, cp, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

async function copyPages(directory = 'src') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await copyPages(source);
    else if (entry.name.endsWith('.html')) {
      const destination = source.replace(/^src\//, 'dist/');
      await mkdir(destination.slice(0, destination.lastIndexOf('/')), { recursive: true });
      await copyFile(source, destination);
    }
  }
}

export async function build() {
  await rm('dist', { recursive: true, force: true });
  await mkdir('dist', { recursive: true });
  await copyPages();
  await cp('public', 'dist', { recursive: true });
  execFileSync(process.execPath, ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', 'src/styles.css', '-o', 'dist/styles.css', '--minify'], { stdio: 'inherit' });
}

if (import.meta.url === `file://${process.argv[1]}`) await build();
