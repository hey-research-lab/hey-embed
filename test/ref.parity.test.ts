import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseEmbedTheme, parseEmbedVariant } from '../src/contract';
import {
  HeyEmbedError,
  embedRefSegment,
  parseEmbedRef,
  readEmbedRef,
  toEmbedRef,
} from '../src/ref';

/**
 * PARITY: refs, variants and themes read as production's route reads them (`refs.json`,
 * `parse.json`: production's parser's answers at the recorded commit), with the documented
 * Robinhood-Chain-only narrowing.
 */
const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/production/${name}`, import.meta.url)), 'utf8'),
  ) as T;

type ProductionRef =
  { kind: 'slug'; slug: string } | { kind: 'contract'; chainId: number; address: string };

const refs = fixture<{ input: string; parsed: ProductionRef | null }[]>('refs.json');
const parse = fixture<{
  variants: { input: string | null; parsed: string }[];
  themes: { input: string | null; parsed: string }[];
}>('parse.json');

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

describe('refs, as production parses a frame path segment', () => {
  it('covers slugs, contracts and refusals', () => {
    expect(refs.length).toBeGreaterThan(20);
    expect(refs.some((r) => r.parsed?.kind === 'slug')).toBe(true);
    expect(refs.some((r) => r.parsed?.kind === 'contract')).toBe(true);
    expect(refs.some((r) => r.parsed === null)).toBe(true);
  });

  for (const { input, parsed } of refs) {
    it(`reads ${JSON.stringify(input.length > 50 ? `${input.slice(0, 47)}…` : input)}`, () => {
      const ours = readEmbedRef(input, { decode: true });
      if (parsed === null) {
        // Production refuses it: so does this package.
        expect(ours.ok).toBe(false);
        return;
      }
      if (parsed.kind === 'contract' && parsed.chainId !== 4663) {
        // Narrowing 1: another chain is unsupported_chain, never a frame.
        expect(ours).toMatchObject({ ok: false, code: 'unsupported_chain' });
        return;
      }
      if (
        parsed.kind === 'contract' &&
        !/^(?:4663:)?0x/.test(decodeURIComponent(input).trim().toLowerCase())
      ) {
        // Narrowing 2: chain 4663 written another way ("04663:") is unsupported_chain too.
        expect(ours).toMatchObject({ ok: false, code: 'unsupported_chain' });
        return;
      }
      expect(ours.ok).toBe(true);
      if (!ours.ok) return;
      if (ours.ref.kind === 'slug') expect(ours.ref).toEqual(parsed);
      else {
        expect({
          kind: ours.ref.kind,
          chainId: ours.ref.chainId,
          address: ours.ref.address,
        }).toEqual(parsed);
      }
    });
  }

  it('keeps the spelling of a contract so URLs match production byte for byte', () => {
    expect(embedRefSegment(toEmbedRef(ADDRESS))).toBe(ADDRESS);
    expect(embedRefSegment(toEmbedRef(`4663:${ADDRESS.toUpperCase().replace('0X', '0x')}`))).toBe(
      `4663:${ADDRESS}`,
    );
  });

  it('never accepts the zero or dead address as a contract (narrowing 3)', () => {
    expect(readEmbedRef(`0x${'0'.repeat(40)}`)).toMatchObject({
      ok: false,
      code: 'not_a_contract_identity',
    });
    expect(readEmbedRef(`4663:0x${'0'.repeat(36)}dead`)).toMatchObject({
      ok: false,
      code: 'not_a_contract_identity',
    });
  });

  it('says why a ref is refused', () => {
    expect(readEmbedRef('')).toMatchObject({ ok: false, code: 'missing_ref' });
    expect(readEmbedRef('0x1234')).toMatchObject({ ok: false, code: 'invalid_address' });
    expect(readEmbedRef(`1:${ADDRESS}`)).toMatchObject({
      ok: false,
      code: 'unsupported_chain',
      message: 'HEY supports Robinhood Chain (4663) only; chain 1 is not supported.',
    });
    expect(readEmbedRef('$HOOD')).toMatchObject({ ok: false, code: 'invalid_ref' });
    expect(readEmbedRef(`eip155:4663:${ADDRESS}`)).toMatchObject({
      ok: false,
      code: 'invalid_ref',
    });
    expect(parseEmbedRef('hood lock')).toBeUndefined();
  });

  it('reads attribute values as written: no percent-decoding unless asked', () => {
    expect(readEmbedRef(`4663%3A${ADDRESS}`).ok).toBe(false);
    expect(readEmbedRef(`4663%3A${ADDRESS}`, { decode: true }).ok).toBe(true);
  });

  it('throws a typed error from toEmbedRef, objects from untyped callers included', () => {
    expect(() => toEmbedRef('nope!')).toThrow(HeyEmbedError);
    const fromJs = {
      kind: 'contract',
      chainId: 1,
      address: ADDRESS,
      chainPrefixed: true,
    } as unknown as Parameters<typeof toEmbedRef>[0];
    expect(() => toEmbedRef(fromJs)).toThrowError(
      expect.objectContaining({ code: 'unsupported_chain' }),
    );
  });
});

describe('variants and themes, as production reads them', () => {
  for (const { input, parsed } of parse.variants) {
    it(`variant ${JSON.stringify(input)} → ${parsed}`, () => {
      expect(parseEmbedVariant(input)).toBe(parsed);
    });
  }
  for (const { input, parsed } of parse.themes) {
    it(`theme ${JSON.stringify(input)} → ${parsed}`, () => {
      expect(parseEmbedTheme(input)).toBe(parsed);
    });
  }
});
