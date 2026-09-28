import { createServer } from 'node:http';
import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { build } from './build.mjs';

const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const watchMode = process.argv.includes('--watch');
const reloadClients = new Set();
const reloadScript = '<script>new EventSource("/__livereload").onmessage=()=>location.reload()</script>';

if (watchMode) await build();

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (watchMode && pathname === '/__livereload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(': connected\n\n');
      reloadClients.add(res);
      req.on('close', () => reloadClients.delete(res));
      return;
    }
    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let body = await readFile(file);
    if (watchMode && extname(file) === '.html') {
      body = body.toString().replace('</body>', `${reloadScript}</body>`);
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log(`${watchMode ? 'Development' : 'Preview'}: http://localhost:4173`));

if (watchMode) {
  let rebuildTimer;
  let rebuilding = false;
  let rebuildQueued = false;

  async function rebuild() {
    if (rebuilding) {
      rebuildQueued = true;
      return;
    }

    rebuilding = true;
    console.log('Source changed. Rebuilding...');
    try {
      await build();
      for (const client of reloadClients) client.write('data: reload\n\n');
      console.log('Build complete. Browser reloaded.');
    } catch (error) {
      console.error('Build failed. Waiting for another change.', error);
    } finally {
      rebuilding = false;
      if (rebuildQueued) {
        rebuildQueued = false;
        void rebuild();
      }
    }
  }

  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => void rebuild(), 100);
  }

  for (const directory of ['src', 'public']) {
    watch(directory, { recursive: true }, scheduleRebuild);
  }
}
