import { spawn } from 'node:child_process';
import { once } from 'node:events';

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${args[0]} failed (${signal || `exit ${code}`}).`));
    });
  });
}

let preview;
try {
  await run(['scripts/build.mjs']);
  preview = spawn(process.execPath, ['scripts/serve.mjs'], {
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let cleanupReady;
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview server did not start within 15 seconds.')), 15000);
    let output = '';
    const ready = chunk => {
      output += chunk;
      const match = output.match(/Preview: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) resolve(match[1]);
    };
    const failed = error => reject(error);
    const exited = code => reject(new Error(`Preview server exited before becoming ready (${code}).`));
    preview.stdout.on('data', ready);
    preview.once('error', failed);
    preview.once('exit', exited);
    // Clear readiness listeners whichever outcome wins.
    cleanupReady = () => {
      clearTimeout(timer);
      preview.stdout.off('data', ready);
      preview.off('error', failed);
      preview.off('exit', exited);
    };
  }).finally(() => cleanupReady?.());
  console.log(`Auditing ${url}`);
  await run([
    'node_modules/lighthouse/cli/index.js', url,
    '--chrome-flags=--headless --no-sandbox',
    '--output=html', '--output=json', '--output-path=./lighthouse-report',
    ...process.argv.slice(2),
  ]);
} catch (error) {
  console.error(`Audit failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (preview && preview.exitCode === null && preview.signalCode === null) {
    const stopped = once(preview, 'exit');
    preview.kill();
    await stopped;
  }
}
