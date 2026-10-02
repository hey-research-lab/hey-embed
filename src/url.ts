import {
  DEFAULT_EMBED_THEME,
  DEFAULT_EMBED_VARIANT,
  EMBED_FRAME_PATH_PREFIX,
  EMBED_THEMES,
  EMBED_VARIANTS,
  HEY_ORIGIN,
  type EmbedTheme,
  type EmbedVariant,
  isEmbedTheme,
  isEmbedVariant,
} from './contract';
import { type EmbedRef, HeyEmbedError, embedRefSegment, toEmbedRef } from './ref';

export interface EmbedFrameOptions {
  variant?: EmbedVariant;
  theme?: EmbedTheme;
}

/**
 * The widget document's URL on heyresearch.xyz:
 * `https://heyresearch.xyz/embed/project/{ref}?variant=<variant>&theme=<theme>`.
 *
 * `ref` is a slug, `0x…` or `4663:0x…` (or an {@link EmbedRef}). The origin is fixed: a widget
 * frame always comes from heyresearch.xyz. Throws {@link HeyEmbedError} for a ref, variant or theme
 * outside the contract — it never falls back silently, unlike the element.
 */
export function embedFrameUrl(ref: string | EmbedRef, options: EmbedFrameOptions = {}): string {
  const variant = options.variant ?? DEFAULT_EMBED_VARIANT;
  const theme = options.theme ?? DEFAULT_EMBED_THEME;
  if (!isEmbedVariant(variant)) {
    throw new HeyEmbedError(
      'invalid_variant',
      `variant must be one of ${EMBED_VARIANTS.join(', ')}.`,
    );
  }
  if (!isEmbedTheme(theme)) {
    throw new HeyEmbedError('invalid_theme', `theme must be one of ${EMBED_THEMES.join(', ')}.`);
  }
  return frameUrlFor(embedRefSegment(toEmbedRef(ref)), variant, theme);
}

/** The URL for an already-validated segment. Same spelling as production's element and snippets. */
export function frameUrlFor(segment: string, variant: EmbedVariant, theme: EmbedTheme): string {
  const params = new URLSearchParams({ variant, theme });
  return `${HEY_ORIGIN}${EMBED_FRAME_PATH_PREFIX}${encodeURIComponent(segment).replace(/%3A/gi, ':')}?${params.toString()}`;
}

/** The project's page on heyresearch.xyz, for a fallback link: `https://heyresearch.xyz/project/{slug}`. */
export function projectPageUrl(slug: string): string {
  const ref = toEmbedRef(slug);
  if (ref.kind !== 'slug') {
    throw new HeyEmbedError('invalid_slug', 'A project page is named by its HEY slug.');
  }
  return `${HEY_ORIGIN}/project/${encodeURIComponent(ref.slug)}`;
}
