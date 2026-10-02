import { CHAIN_ID } from './chain';
import { DEAD_ADDRESS, ZERO_ADDRESS } from './evm';

/**
 * What a widget names: a HEY project slug, or a Robinhood Chain contract.
 *
 * A contract is written `0x…` (the chain HEY indexes) or `4663:0x…`. A ticker is never a ref:
 * token identity is the chain and the address. `chainPrefixed` remembers which spelling was used,
 * so a URL built from the ref is byte-identical to the one production's own element builds.
 */
export type EmbedRef =
  | { kind: 'slug'; slug: string }
  | { kind: 'contract'; chainId: typeof CHAIN_ID; address: string; chainPrefixed: boolean };

export type EmbedErrorCode =
  | 'missing_ref'
  | 'invalid_ref'
  | 'invalid_slug'
  | 'invalid_address'
  | 'unsupported_chain'
  | 'not_a_contract_identity'
  | 'invalid_variant'
  | 'invalid_theme'
  | 'invalid_height'
  | 'invalid_script_src';

export class HeyEmbedError extends Error {
  override readonly name = 'HeyEmbedError';
  constructor(
    readonly code: EmbedErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type EmbedRefResult =
  { ok: true; ref: EmbedRef } | { ok: false; code: EmbedErrorCode; message: string };

/** Production's slug rule for embeds: lowercase letters, digits and inner hyphens, 1–120 long. */
export const EMBED_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/;

/** A contract as production's element accepts it: optional `<chainId>:`, then 40 hex digits. */
export const EMBED_CONTRACT_RE = /^(?:(\d{1,9}):)?(0x[0-9a-f]{40})$/;

const CONTRACT_SHAPED = /^(?:(\d{1,9}):)?(0x[0-9a-f]+)$/;
const MAX_REF_LENGTH = 140;

const fail = (code: EmbedErrorCode, message: string): EmbedRefResult => ({
  ok: false,
  code,
  message,
});

/**
 * Reads a ref the way production's widget route does — trimmed and lower-cased, a contract-shaped
 * value is a contract, anything else must be a slug — and then holds it to Robinhood Chain only:
 * a chain other than 4663 (written any other way, `04663` included) is `unsupported_chain`, and the
 * zero and dead addresses are never a contract identity.
 *
 * `decode: true` percent-decodes first, as the route does with its path segment. Attribute values
 * and builder input are read as written (the default), as production's element does.
 */
export function readEmbedRef(
  raw: string | null | undefined,
  options: { decode?: boolean } = {},
): EmbedRefResult {
  let value = raw ?? '';
  if (options.decode) {
    try {
      value = decodeURIComponent(value);
    } catch {
      return fail('invalid_ref', 'The ref is not valid percent-encoding.');
    }
  }
  value = value.trim().toLowerCase();
  if (!value) return fail('missing_ref', 'Name a project by its HEY slug, or a contract.');
  if (value.length > MAX_REF_LENGTH) return fail('invalid_ref', 'The ref is too long.');

  const contract = CONTRACT_SHAPED.exec(value);
  if (contract) {
    const chain = contract[1];
    const address = contract[2] ?? '';
    if (!/^0x[0-9a-f]{40}$/.test(address)) {
      return fail('invalid_address', 'A contract is 0x followed by 40 hexadecimal characters.');
    }
    if (chain !== undefined && chain !== String(CHAIN_ID)) {
      return fail(
        'unsupported_chain',
        `HEY supports Robinhood Chain (4663) only; chain ${chain} is not supported.`,
      );
    }
    if (address === ZERO_ADDRESS || address === DEAD_ADDRESS) {
      return fail('not_a_contract_identity', 'The zero and dead addresses are never a contract.');
    }
    return {
      ok: true,
      ref: { kind: 'contract', chainId: CHAIN_ID, address, chainPrefixed: chain !== undefined },
    };
  }
  if (EMBED_SLUG_RE.test(value)) return { ok: true, ref: { kind: 'slug', slug: value } };
  return fail(
    'invalid_ref',
    'Name a project by its HEY slug (lowercase letters, digits and hyphens), or a contract as 0x… or 4663:0x….',
  );
}

/** {@link readEmbedRef} as production's parser answers: the ref, or `undefined`. */
export function parseEmbedRef(
  raw: string | null | undefined,
  options: { decode?: boolean } = {},
): EmbedRef | undefined {
  const result = readEmbedRef(raw, options);
  return result.ok ? result.ref : undefined;
}

/** The path segment for a ref: the slug, `0x…`, or `4663:0x…` — as it was written. */
export function embedRefSegment(ref: EmbedRef): string {
  if (ref.kind === 'slug') return ref.slug;
  return ref.chainPrefixed ? `${ref.chainId}:${ref.address}` : ref.address;
}

/** Throws {@link HeyEmbedError} for anything {@link readEmbedRef} refuses. */
export function toEmbedRef(ref: string | EmbedRef): EmbedRef {
  if (typeof ref !== 'string') {
    // Re-read an object too: it may come from untyped JavaScript.
    const result = readEmbedRef(embedRefSegment(ref));
    if (!result.ok) throw new HeyEmbedError(result.code, result.message);
    return result.ref;
  }
  const result = readEmbedRef(ref);
  if (!result.ok) throw new HeyEmbedError(result.code, result.message);
  return result.ref;
}
