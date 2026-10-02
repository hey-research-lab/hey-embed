import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The element must not phone home: no request of its own, no analytics, no storage, nothing read
 * from the host page but its own attributes. This holds the source to it; `scripts/check-bundle.mjs`
 * holds the built bundle to the same list after every build.
 */
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const FORBIDDEN = [
  'cookie',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'referrer',
  'location',
  'querySelector',
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document.write',
  'fetch(',
  'XMLHttpRequest',
  'sendBeacon',
  'WebSocket',
  'EventSource',
  'navigator',
  'eval(',
  'Function(',
  'postMessage',
  'srcdoc',
  'allow-same-origin',
];

const code = (file: string): string =>
  readFileSync(`${SRC}${file}`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('source hygiene', () => {
  const files = readdirSync(SRC).filter((f) => f.endsWith('.ts'));

  it('reads every source file', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'contract.ts',
        'element.ts',
        'index.ts',
        'react.ts',
        'url.ts',
        'snippets.ts',
      ]),
    );
  });

  for (const file of files) {
    it(`${file} holds nothing that reads the page, stores or calls out`, () => {
      const source = code(file);
      for (const word of FORBIDDEN) expect(source, `${file}: ${word}`).not.toContain(word);
    });
  }

  it('names only heyresearch.xyz as an origin (the shared chain module also names the explorer)', () => {
    for (const file of files) {
      const origins = code(file).match(/https?:\/\/[a-z0-9.-]+/gi) ?? [];
      const allowed =
        file === 'chain.ts'
          ? ['https://heyresearch.xyz', 'https://robinhoodchain.blockscout.com']
          : ['https://heyresearch.xyz'];
      for (const origin of origins) expect(allowed, `${file}: ${origin}`).toContain(origin);
    }
  });
});
