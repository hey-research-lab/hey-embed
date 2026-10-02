/**
 * The embed contract HEY Research Lab's production serves, as constants.
 *
 * Every value here is a value production uses for `/embed/project/{ref}`, `/embed/hey-project.js`
 * and the copy-paste snippets of https://heyresearch.xyz/developers/embeds. The parity tests hold
 * this file to the fixtures in `test/fixtures/production/`, which are copied from production at a
 * recorded commit (see CONTRIBUTING.md). Change a value here only when production changed it.
 */

/** The only origin a widget frame is ever loaded from. There is no override. */
export const HEY_ORIGIN = 'https://heyresearch.xyz' as const;

/** The custom element's tag name. */
export const EMBED_ELEMENT_NAME = 'hey-project' as const;

/** Where production serves its own copy of the Web Component. */
export const EMBED_SCRIPT_PATH = '/embed/hey-project.js' as const;
export const EMBED_SCRIPT_URL = `${HEY_ORIGIN}${EMBED_SCRIPT_PATH}` as const;

/** The widget document's path, before the ref segment. */
export const EMBED_FRAME_PATH_PREFIX = '/embed/project/' as const;

/** The configurator on heyresearch.xyz. */
export const EMBED_CONFIGURATOR_URL = `${HEY_ORIGIN}/developers/embeds` as const;

/**
 * The widgets, each one of HEY's canonical reads and nothing else:
 *
 *  - `compact`  name, activity status and the latest ship;
 *  - `builder`  status, latest ship, meaningful ships in 30 days, verified builder;
 *  - `changes`  the project's newest change-ledger events, "shown of total";
 *  - `full`     the intelligence card: the research summary's build line, the builder facts and
 *               the latest change;
 *  - `signal`   the newest HEY Signal about building or contracts (market signals are left out).
 */
export const EMBED_VARIANTS = ['compact', 'builder', 'changes', 'full', 'signal'] as const;
export type EmbedVariant = (typeof EMBED_VARIANTS)[number];

export const EMBED_THEMES = ['light', 'dark', 'auto'] as const;
export type EmbedTheme = (typeof EMBED_THEMES)[number];

export const DEFAULT_EMBED_VARIANT: EmbedVariant = 'builder';
export const DEFAULT_EMBED_THEME: EmbedTheme = 'auto';

/** How heyresearch.xyz names each variant in its configurator. */
export const EMBED_VARIANT_LABELS: Readonly<Record<EmbedVariant, { label: string; help: string }>> =
  {
    compact: { label: 'Compact', help: 'Name, activity status and the latest ship, in one line.' },
    builder: {
      label: 'Builder',
      help: 'Status, latest ship, meaningful ships in 30 days and whether HEY verified the builder.',
    },
    changes: {
      label: 'Latest changes',
      help: 'The newest changes HEY recorded for the project, with how many there are in all.',
    },
    full: {
      label: 'Intelligence card',
      help: 'The research summary line, the builder facts and the latest change.',
    },
    signal: {
      label: 'Signal',
      help: 'The newest HEY Signal about building or contracts. Market signals are never shown here.',
    },
  };

/**
 * The height each variant is first drawn at, in CSS pixels, before the frame reports its own.
 * Close to the real height at 320px wide so the host page does not jump.
 */
export const EMBED_INITIAL_HEIGHT: Readonly<Record<EmbedVariant, number>> = {
  compact: 120,
  builder: 196,
  changes: 280,
  full: 340,
  signal: 176,
};

/** The frame's height is clamped to this range whatever it reports. */
export const EMBED_HEIGHT_RANGE = { min: 60, max: 1200 } as const;

/** The `postMessage` type the frame sends its height under. The frame never sends anything else. */
export const EMBED_HEIGHT_MESSAGE = 'hey-embed:height' as const;

/** The `utm_source` the widget's own link to the project page carries (set by heyresearch.xyz). */
export const EMBED_UTM_SOURCE = 'embed' as const;

/**
 * The iframe sandbox production's element, iframe snippet and React snippet all use.
 *
 *  - `allow-scripts`: the frame runs one same-origin script that reports its height;
 *  - `allow-popups`: the widget's links open the project page in a new tab;
 *  - `allow-popups-to-escape-sandbox`: that new tab is an ordinary page, not a sandboxed one.
 *
 * Never `allow-same-origin`, `allow-forms`, `allow-top-navigation` or `allow-modals`.
 */
export const EMBED_SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox' as const;

/** The frame's accessible title when the element carries no `label`. */
export const EMBED_DEFAULT_TITLE = 'Project intelligence from HEY Research Lab' as const;

/** A `label` longer than this is cut to it. */
export const EMBED_TITLE_MAX_LENGTH = 120;

/** The attributes production's `<hey-project>` reads (`/embed/hey-project.js`). */
export const EMBED_ELEMENT_ATTRIBUTES = [
  'project',
  'contract',
  'variant',
  'theme',
  'label',
] as const;

/**
 * Attributes only this package's element reads. Neither changes the frame URL:
 *  - `slug`: an alias of `project` (`project` wins when both are present);
 *  - `height`: the first height drawn, before the frame reports its own.
 * Prefer `project` in markup that may also be served by the hosted script.
 */
export const EMBED_PACKAGE_ATTRIBUTES = ['slug', 'height'] as const;

export type EmbedAttributeName =
  (typeof EMBED_ELEMENT_ATTRIBUTES)[number] | (typeof EMBED_PACKAGE_ATTRIBUTES)[number];

export function isEmbedVariant(value: string | null | undefined): value is EmbedVariant {
  return (EMBED_VARIANTS as readonly string[]).includes(value ?? '');
}

export function isEmbedTheme(value: string | null | undefined): value is EmbedTheme {
  return (EMBED_THEMES as readonly string[]).includes(value ?? '');
}

/** Production's lenient reading: trimmed, lower-cased, and the default when it names no variant. */
export function parseEmbedVariant(value: string | null | undefined): EmbedVariant {
  const cleaned = (value ?? '').trim().toLowerCase();
  return isEmbedVariant(cleaned) ? cleaned : DEFAULT_EMBED_VARIANT;
}

/** Production's lenient reading: trimmed, lower-cased, and the default when it names no theme. */
export function parseEmbedTheme(value: string | null | undefined): EmbedTheme {
  const cleaned = (value ?? '').trim().toLowerCase();
  return isEmbedTheme(cleaned) ? cleaned : DEFAULT_EMBED_THEME;
}

/** A reported height, rounded up and held to {@link EMBED_HEIGHT_RANGE}. */
export function clampEmbedHeight(height: number): number {
  return Math.min(Math.max(Math.ceil(height), EMBED_HEIGHT_RANGE.min), EMBED_HEIGHT_RANGE.max);
}
