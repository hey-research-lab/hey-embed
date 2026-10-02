import { defineConfig } from 'tsup';

// Browsers: ES2019 keeps native classes, which custom elements require.
const target = 'es2019';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    target,
    sourcemap: false,
  },
  {
    // The React wrapper is a client component in frameworks that tell the two apart.
    entry: { react: 'src/react.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    target,
    external: ['react'],
    banner: { js: "'use client';" },
  },
  {
    // The <script> bundle: one file, no imports, registers <hey-project> and sets window.HeyEmbed.
    entry: { 'hey-embed': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'HeyEmbed',
    target,
    minify: true,
    outExtension: () => ({ js: '.iife.js' }),
    banner: {
      js: '/*! @hey-research-lab/embed — <hey-project> for HEY Research Lab widgets served by https://heyresearch.xyz. MIT. */',
    },
  },
]);
