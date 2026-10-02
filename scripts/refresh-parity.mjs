#!/usr/bin/env node
// Refreshes test/fixtures/production/hey-project.js and frame.js from what heyresearch.xyz serves
// today. Fixed URLs only (no user input), https, no redirects, 10 s timeout, 256 KB cap. After a
// refresh, `pnpm test` shows every place this package no longer matches production's contract.
// contract.json, refs.json, parse.json and snippets.json are rebuilt by a maintainer with
// access to production's source (CONTRIBUTING.md); this script only reports whether they still
// agree with the served script.
import { readFileSync, writeFileSync } from 'node:fs';

const FILES = {
  'hey-project.js': 'https://heyresearch.xyz/embed/hey-project.js',
  'frame.js': 'https://heyresearch.xyz/embed/frame.js',
};
const MAX_BYTES = 256 * 1024;
const DIR = new URL('../test/fixtures/production/', import.meta.url);

let changed = 0;
for (const [name, url] of Object.entries(FILES)) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (response.status !== 200) throw new Error(`${url} answered ${response.status}`);
  const type = response.headers.get('content-type') ?? '';
  if (!type.startsWith('text/javascript')) throw new Error(`${url} is ${type}, not JavaScript`);
  const body = new Uint8Array(await response.arrayBuffer());
  if (body.byteLength > MAX_BYTES) throw new Error(`${url} is larger than ${MAX_BYTES} bytes`);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
  const path = new URL(name, DIR);
  const before = readFileSync(path, 'utf8');
  if (before === text) {
    console.log(`${name}: unchanged`);
  } else {
    writeFileSync(path, text);
    changed += 1;
    console.log(`${name}: UPDATED from ${url}`);
  }
}
console.log(
  changed
    ? 'Production changed. Run `pnpm test` and follow what fails.'
    : 'Fixtures match production.',
);
