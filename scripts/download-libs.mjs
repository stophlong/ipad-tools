#!/usr/bin/env node
// Produces the local-fallback libraries that index.html expects to find next
// to itself when CDNs are unreachable (offline Windows PC use, and the
// Playwright tests, which deliberately block the CDN hosts).
//
// The files are copied from the pinned npm packages in node_modules — the
// same versions as the CDN <script> tags in index.html — so run `npm install`
// first. Usage: npm run setup
//
// unicodeit is ESM-only on npm, but index.html loads unicodeit.js as a
// classic script that must set window.unicodeitLib, so it gets bundled to an
// IIFE with esbuild instead of copied.

import { copyFile, writeFile, access, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const copies = [
  ['math.js', 'node_modules/mathjs/lib/browser/math.js'],
  ['luxon.js', 'node_modules/luxon/build/global/luxon.min.js'],
  ['plotly.min.js', 'node_modules/plotly.js-dist-min/plotly.min.js'],
];

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

for (const [file, src] of copies) {
  const dest = path.join(root, file);
  if (await exists(dest)) {
    console.log(`✓ ${file} already present, skipping`);
    continue;
  }
  const absSrc = path.join(root, src);
  if (!(await exists(absSrc))) {
    throw new Error(`${src} not found — run \`npm install\` first`);
  }
  await copyFile(absSrc, dest);
  console.log(`✓ ${file} <- ${src}`);
}

const unicodeitDest = path.join(root, 'unicodeit.js');
if (await exists(unicodeitDest)) {
  console.log('✓ unicodeit.js already present, skipping');
} else {
  const entry = path.join(root, 'scripts', '.unicodeit-entry.mjs');
  await writeFile(entry, "import u from 'unicodeit';\nwindow.unicodeitLib = u;\n");
  execSync(`npx esbuild "${entry}" --bundle --minify --format=iife --outfile="${unicodeitDest}"`, {
    cwd: root,
    stdio: 'inherit',
  });
  await rm(entry);
  console.log('✓ unicodeit.js (bundled from npm package)');
}

console.log('All local libraries ready.');
