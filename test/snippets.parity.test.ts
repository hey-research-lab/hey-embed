import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { EMBED_THEMES, EMBED_VARIANTS, type EmbedTheme, type EmbedVariant } from '../src/contract';
import { HeyEmbedError } from '../src/ref';
import {
  htmlSnippet,
  iframeSnippet,
  reactSnippet,
  scriptTag,
  type SnippetTarget,
} from '../src/snippets';
import { embedFrameUrl, projectPageUrl } from '../src/url';

/**
 * PARITY: the URL builder and the snippet builders spell what production's configurator hands
 * out, byte for byte (`snippets.json`: production's own output at the recorded commit).
 */
const snippets = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('./fixtures/production/snippets.json', import.meta.url)),
    'utf8',
  ),
) as { target: SnippetTarget; frameUrl: string; html: string; iframe: string; react: string }[];

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

function jsxErrors(code: string): string[] {
  const output = ts.transpileModule(code, {
    fileName: 'HeyProject.jsx',
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, allowJs: true },
  });
  return (output.diagnostics ?? []).map((d) =>
    ts.flattenDiagnosticMessageText(d.messageText, '\n'),
  );
}

describe('parity with production snippets', () => {
  it('has fixtures for slugs, both contract spellings and a hostile name', () => {
    expect(snippets.length).toBeGreaterThanOrEqual(5);
  });

  for (const entry of snippets) {
    describe(`${entry.target.ref} / ${entry.target.variant} / ${entry.target.theme}`, () => {
      it('builds the same frame URL', () => {
        expect(embedFrameUrl(entry.target.ref, entry.target)).toBe(entry.frameUrl);
      });
      it('builds the same HTML snippet', () => {
        expect(htmlSnippet(entry.target)).toBe(entry.html);
      });
      it('builds the same iframe snippet', () => {
        expect(iframeSnippet(entry.target)).toBe(entry.iframe);
      });
      it('builds the same React snippet', () => {
        expect(reactSnippet(entry.target)).toBe(entry.react);
      });
    });
  }
});

describe('embedFrameUrl', () => {
  it('always points at heyresearch.xyz with variant and theme, defaults builder/auto', () => {
    expect(embedFrameUrl('hoodlock')).toBe(
      'https://heyresearch.xyz/embed/project/hoodlock?variant=builder&theme=auto',
    );
    expect(embedFrameUrl(`4663:${ADDRESS}`, { variant: 'compact', theme: 'dark' })).toBe(
      `https://heyresearch.xyz/embed/project/4663:${ADDRESS}?variant=compact&theme=dark`,
    );
    expect(embedFrameUrl({ kind: 'slug', slug: 'agentos' }, { variant: 'signal' })).toBe(
      'https://heyresearch.xyz/embed/project/agentos?variant=signal&theme=auto',
    );
  });

  it('refuses what the contract does not hold, with a code', () => {
    const code = (fn: () => unknown): string | undefined => {
      try {
        fn();
      } catch (error) {
        expect(error).toBeInstanceOf(HeyEmbedError);
        return (error as HeyEmbedError).code;
      }
      return undefined;
    };
    expect(code(() => embedFrameUrl('Bad Slug'))).toBe('invalid_ref');
    expect(code(() => embedFrameUrl(`8453:${ADDRESS}`))).toBe('unsupported_chain');
    expect(code(() => embedFrameUrl('x', { variant: 'mega' as EmbedVariant }))).toBe(
      'invalid_variant',
    );
    expect(code(() => embedFrameUrl('x', { theme: 'neon' as EmbedTheme }))).toBe('invalid_theme');
    expect(code(() => projectPageUrl(ADDRESS))).toBe('invalid_slug');
  });

  it('builds a URL for every variant and theme', () => {
    for (const variant of EMBED_VARIANTS) {
      for (const theme of EMBED_THEMES) {
        expect(embedFrameUrl('x', { variant, theme })).toBe(
          `https://heyresearch.xyz/embed/project/x?variant=${variant}&theme=${theme}`,
        );
      }
    }
  });
});

describe('snippets', () => {
  const target: SnippetTarget = {
    ref: 'hoodlock',
    slug: 'hoodlock',
    name: 'HoodLock',
    variant: 'builder',
    theme: 'auto',
  };

  it('React snippet compiles as JSX for every variant and theme (and the check can fail)', () => {
    expect(jsxErrors('export const X = () => <div>;')).not.toEqual([]);
    for (const variant of EMBED_VARIANTS) {
      for (const theme of EMBED_THEMES) {
        expect(jsxErrors(reactSnippet({ ...target, variant, theme }))).toEqual([]);
      }
    }
  });

  it('can point the HTML snippet at a pinned copy of this package, https only', () => {
    const pinned =
      'https://cdn.jsdelivr.net/npm/@hey-research-lab/embed@0.1.0/dist/hey-embed.iife.js';
    expect(htmlSnippet(target, { scriptSrc: pinned }).split('\n')[0]).toBe(
      `<script src="${pinned}" async></script>`,
    );
    expect(() => htmlSnippet(target, { scriptSrc: 'http://example.com/x.js' })).toThrow(
      HeyEmbedError,
    );
    expect(() => htmlSnippet(target, { scriptSrc: 'javascript:alert(1)' })).toThrow(HeyEmbedError);
    expect(() => htmlSnippet(target, { scriptSrc: 'https://u:p@example.com/x.js' })).toThrow(
      HeyEmbedError,
    );
  });

  it('writes a script tag with subresource integrity when given one', () => {
    expect(scriptTag()).toBe(
      '<script src="https://heyresearch.xyz/embed/hey-project.js" async></script>',
    );
    expect(
      scriptTag({ scriptSrc: 'https://example.com/hey-embed.iife.js', integrity: 'sha384-abc+/=' }),
    ).toBe(
      '<script src="https://example.com/hey-embed.iife.js" integrity="sha384-abc+/=" crossorigin="anonymous" async></script>',
    );
    expect(() => scriptTag({ integrity: '"><script>' })).toThrow(HeyEmbedError);
  });

  it('refuses another chain and an out-of-range height', () => {
    expect(() => htmlSnippet({ ...target, ref: `1:${ADDRESS}` })).toThrow(HeyEmbedError);
    expect(() => iframeSnippet(target, 20)).toThrow(HeyEmbedError);
    expect(() => iframeSnippet(target, 99999)).toThrow(HeyEmbedError);
    expect(iframeSnippet(target, 300)).toContain('height="300"');
  });

  it('escapes a hostile name everywhere it lands', () => {
    const hostile = { ...target, name: '"><script>alert(1)</script>' };
    expect(htmlSnippet(hostile)).not.toContain('<script>alert');
    expect(iframeSnippet(hostile)).not.toContain('"><script>');
    expect(jsxErrors(reactSnippet(hostile))).toEqual([]);
  });
});
