// 各 feature を独立して書き、ここで 1 つの拡張機能 (dist/) に束ねる。
import { build, context } from 'esbuild';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, existsSync, cpSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const watch = process.argv.includes('--watch');
const require = createRequire(import.meta.url);

// webview を持つ feature。packages/feature-<name>/src/webview/main.tsx
const webviews = ['office', 'pdf'];

mkdirSync('dist/webview', { recursive: true });

// ibisOffice (vendor/ibis-office を scripts/build-ibis.sh でビルド済みであること)
const ibisWww = 'vendor/ibis-office/www';
const hasIbis = existsSync(`${ibisWww}/pkg/ibis_office_app_bg.wasm`);
if (hasIbis) {
  mkdirSync('dist/webview/ibis', { recursive: true });
  cpSync(`${ibisWww}/pkg/ibis_office_app_bg.wasm`, 'dist/webview/ibis/ibis_office_app_bg.wasm');
  cpSync(`${ibisWww}/assets`, 'dist/webview/ibis/assets', { recursive: true });
} else {
  console.warn('ibisOffice の WASM が見つかりません: npm run build:ibis を先に実行してください');
}

const common = { bundle: true, sourcemap: watch, logLevel: 'info', minify: !watch };

const targets = [
  // extension host
  {
    ...common,
    entryPoints: ['packages/extension/src/extension.ts'],
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
  },
  // webview (feature ごとに別バンドル)
  ...webviews.map((n) => ({
    ...common,
    entryPoints: [`packages/feature-${n}/src/webview/main.tsx`],
    outfile: `dist/webview/${n}.js`,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  })),
  // pdf.js worker
  {
    ...common,
    entryPoints: [require.resolve('pdfjs-dist/build/pdf.worker.mjs')],
    outfile: 'dist/webview/pdf.worker.js',
    platform: 'browser',
    format: 'iife',
  },
];

const tailwind = (name) => {
  const args = [
    'tailwindcss',
    '-i', `packages/feature-${name}/src/webview/index.css`,
    '-o', `dist/webview/${name}.css`,
    ...(watch ? ['--watch'] : ['--minify']),
  ];
  return watch
    ? spawn('npx', args, { stdio: 'inherit' })
    : execFileSync('npx', args, { stdio: 'inherit' });
};

for (const n of webviews) tailwind(n);

if (watch) {
  for (const t of targets) await (await context(t)).watch();
} else {
  await Promise.all(targets.map((t) => build(t)));
}
