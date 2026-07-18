import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const outputDir = resolve(root, '.vercel', 'output');
const staticDir = resolve(outputDir, 'static');

if (!existsSync(distDir)) {
  console.error('[vercel-output] Missing dist directory. Run vite build before preparing Vercel output.');
  process.exit(1);
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
cpSync(distDir, staticDir, { recursive: true });

writeFileSync(
  resolve(outputDir, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: '/sw\\.js',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          continue: true
        },
        {
          src: '/workbox-.*\\.js',
          headers: {
            'Cache-Control': 'public, max-age=31536000, immutable'
          },
          continue: true
        },
        {
          src: '/manifest\\.webmanifest',
          headers: {
            'Cache-Control': 'public, max-age=3600'
          },
          continue: true
        },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index.html' }
      ]
    },
    null,
    2
  )
);

console.log('[vercel-output] Prepared .vercel/output/static from dist.');
