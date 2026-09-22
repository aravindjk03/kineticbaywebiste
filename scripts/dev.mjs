#!/usr/bin/env node
/** Runs the Worker API (wrangler dev :8787) and the Vite front end together. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

// wrangler serves ./dist as static assets; it only needs the folder to exist in dev
if (!existsSync('dist')) mkdirSync('dist');

const win = process.platform === 'win32';
const run = (name, args) => {
  const p = spawn(win ? 'npx.cmd' : 'npx', args, { stdio: 'inherit', shell: win });
  p.on('exit', (code) => {
    console.log(`[${name}] exited with ${code}`);
    process.exit(code ?? 0);
  });
  return p;
};

const procs = [
  run('api', ['wrangler', 'dev', '--port', '8787', '--local']),
  run('web', ['vite', ...process.argv.slice(2)]),
];
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => procs.forEach((p) => p.kill()));
