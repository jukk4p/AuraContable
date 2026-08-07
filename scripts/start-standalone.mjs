/**
 * Arranca la salida `standalone` en local, replicando lo que hace el Dockerfile.
 *
 * `next start` NO funciona con `output: 'standalone'` — el propio Next lo avisa
 * y las Server Actions responden 503. Como `npm start` era justamente eso, daba
 * un servidor roto que parecía sano. Esto copia los estáticos junto a server.js,
 * igual que el Dockerfile, y lo lanza.
 */
import { cp, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

if (!(await exists(path.join(standalone, 'server.js')))) {
  console.error('No hay salida standalone. Ejecuta primero: npm run build');
  process.exit(1);
}

// Next no incluye estos dos en la salida standalone; hay que copiarlos al lado.
await cp(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true, force: true });
await cp(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), { recursive: true, force: true });

const child = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT ?? '9002' },
});

child.on('exit', (code) => process.exit(code ?? 0));
