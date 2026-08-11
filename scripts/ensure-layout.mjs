#!/usr/bin/env node
/**
 * Ensures CS-Trust uses the split layout:
 *   frontend/  — React + Vite
 *   backend/   — FastAPI
 *
 * Safe to run after `git pull` on machines that still have the old
 * root-level frontend files, or leftover local .env / node_modules.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const backend = path.join(root, 'backend');

const FRONTEND_ITEMS = [
  'src',
  'public',
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
  '.oxlintrc.json',
  '.env',
];

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function movePath(from, to) {
  if (!exists(from)) return false;
  if (exists(to)) {
    console.log(`  skip (already exists): ${path.relative(root, to)}`);
    return false;
  }
  ensureDir(path.dirname(to));
  fs.renameSync(from, to);
  console.log(`  moved ${path.relative(root, from)} → ${path.relative(root, to)}`);
  return true;
}

function main() {
  console.log('CS-Trust layout check…');

  if (!exists(backend)) {
    console.warn('  warning: backend/ folder missing — pull latest from origin/dev-indra');
  }

  ensureDir(frontend);

  // Migrate old root-level frontend into frontend/
  let moved = 0;
  for (const name of FRONTEND_ITEMS) {
    const from = path.join(root, name);
    const to = path.join(frontend, name);
    // Don't steal the root orchestrator package.json once frontend already has its own
    if (name === 'package.json' && exists(to) && exists(from)) {
      continue;
    }
    if (movePath(from, to)) moved += 1;
  }

  // Prefer keeping a local frontend .env if root still has one leftover
  movePath(path.join(root, '.env'), path.join(frontend, '.env'));

  const frontendReady = exists(path.join(frontend, 'package.json')) && exists(path.join(frontend, 'src'));
  const backendReady = exists(path.join(backend, 'app', 'main.py'));

  if (frontendReady && backendReady) {
    console.log('  layout OK: frontend/ + backend/');
  } else {
    console.warn('  layout incomplete after migration. Run: git pull origin dev-indra');
  }

  if (exists(path.join(root, 'node_modules')) && !exists(path.join(frontend, 'node_modules'))) {
    console.log('  tip: old root node_modules detected — run: npm --prefix frontend install');
    console.log('       then you can delete the root node_modules folder');
  }

  if (moved > 0) {
    console.log(`  rearranged ${moved} leftover path(s) from the old layout`);
  }

  console.log('Done.');
}

main();
