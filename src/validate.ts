import {
  DEFAULT_EMBED_THEME,
  DEFAULT_EMBED_VARIANT,
  EMBED_DEFAULT_TITLE,
  EMBED_HEIGHT_RANGE,
  EMBED_INITIAL_HEIGHT,
  EMBED_TITLE_MAX_LENGTH,
  type EmbedAttributeName,
  type EmbedTheme,
  type EmbedVariant,
  isEmbedTheme,
  isEmbedVariant,
} from './contract';
import { type EmbedErrorCode, type EmbedRef, embedRefSegment, readEmbedRef } from './ref';

/** The element's attributes as strings, the way `getAttribute` returns them. */
export type EmbedAttributes = Partial<Record<EmbedAttributeName, string | null | undefined>>;

export type EmbedWarningCode =
  'slug_ignored' | 'project_ignored' | 'contract_in_project' | 'label_truncated';

export interface EmbedAttributeIssue {
  attribute: EmbedAttributeName;
  code: EmbedErrorCode | EmbedWarningCode;
  message: string;
}

export interface EmbedAttributeReading {
  /** True when a frame will be drawn and no attribute was refused. */
  ok: boolean;
  /** The project the frame names, when one attribute names one validly. */
  ref?: EmbedRef;
  /** The frame URL's path segment for {@link ref}. */
  segment?: string;
  variant: EmbedVariant;
  theme: EmbedTheme;
  /** The height first drawn: the `height` attribute when valid, else the variant's own. */
  initialHeight: number;
  /** The frame's accessible title. */
  title: string;
  /** Attributes that were refused. The element falls back as production's does (see README). */
  errors: EmbedAttributeIssue[];
  /** Attributes that were read but changed nothing, or were shortened. */
  warnings: EmbedAttributeIssue[];
}

const present = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim() !== '';

/**
 * Reads `<hey-project>` attributes exactly as the element does, and says what was refused.
 *
 * Resolution matches production's element: a valid `contract` wins; otherwise `project` (or its
 * alias `slug`) when it is a valid slug; otherwise no frame is drawn and the fallback content
 * inside the element stays visible. An unknown `variant` or `theme` falls back to the default
 * (`builder`, `auto`), as production does — the validator reports it so an author can fix it.
 */
export function readEmbedAttributes(attributes: EmbedAttributes): EmbedAttributeReading {
  const errors: EmbedAttributeIssue[] = [];
  const warnings: EmbedAttributeIssue[] = [];
  let ref: EmbedRef | undefined;

  const contract = attributes.contract;
  if (present(contract)) {
    const result = readEmbedRef(contract);
    if (result.ok && result.ref.kind === 'contract') ref = result.ref;
    else if (result.ok) {
      errors.push({
        attribute: 'contract',
        code: 'invalid_address',
        message: 'A contract is 0x followed by 40 hexadecimal characters, optionally after 4663:.',
      });
    } else {
      const code = result.code === 'invalid_ref' ? 'invalid_address' : result.code;
      errors.push({ attribute: 'contract', code, message: result.message });
    }
  }

  const projectAttribute: 'project' | 'slug' = attributes.project != null ? 'project' : 'slug';
  const project = attributes[projectAttribute];
  if (attributes.project != null && attributes.slug != null) {
    warnings.push({
      attribute: 'slug',
      code: 'slug_ignored',
      message: '`project` and `slug` are both set; `project` is used.',
    });
  }
  if (present(project)) {
    const result = readEmbedRef(project);
    // Production's element reads `project` with its slug rule, which a bare `0x…` also passes, and
    // its route then reads that segment as a contract. Keep that, and say `contract` is meant.
    const bareContract = result.ok && result.ref.kind === 'contract' && !result.ref.chainPrefixed;
    if (bareContract && !ref) {
      ref = result.ref;
      warnings.push({
        attribute: projectAttribute,
        code: 'contract_in_project',
        message: 'This names a contract; write it as `contract="0x…"`.',
      });
    } else if (result.ok && (result.ref.kind === 'slug' || bareContract)) {
      if (ref) {
        warnings.push({
          attribute: projectAttribute,
          code: 'project_ignored',
          message: 'A valid `contract` is set; it names the widget and the slug is not used.',
        });
      } else ref = result.ref;
    } else {
      errors.push({
        attribute: projectAttribute,
        code: 'invalid_slug',
        message:
          'A HEY slug is lowercase letters, digits and inner hyphens, 1–120 characters. Use `contract` for an address.',
      });
    }
  }

  if (!ref && errors.length === 0) {
    errors.push({
      attribute: 'project',
      code: 'missing_ref',
      message: 'Name a project with `project="<slug>"` or `contract="0x…"`.',
    });
  }

  let variant = DEFAULT_EMBED_VARIANT;
  if (present(attributes.variant)) {
    const cleaned = attributes.variant.trim().toLowerCase();
    if (isEmbedVariant(cleaned)) variant = cleaned;
    else {
      errors.push({
        attribute: 'variant',
        code: 'invalid_variant',
        message: `Unknown variant; the widget falls back to "${DEFAULT_EMBED_VARIANT}".`,
      });
    }
  }

  let theme = DEFAULT_EMBED_THEME;
  if (present(attributes.theme)) {
    const cleaned = attributes.theme.trim().toLowerCase();
    if (isEmbedTheme(cleaned)) theme = cleaned;
    else {
      errors.push({
        attribute: 'theme',
        code: 'invalid_theme',
        message: `Unknown theme; the widget falls back to "${DEFAULT_EMBED_THEME}".`,
      });
    }
  }

  let initialHeight = EMBED_INITIAL_HEIGHT[variant];
  if (attributes.height != null) {
    const height = parseEmbedHeight(attributes.height);
    if (height === undefined) {
      errors.push({
        attribute: 'height',
        code: 'invalid_height',
        message: `A height is a whole number of pixels from ${EMBED_HEIGHT_RANGE.min} to ${EMBED_HEIGHT_RANGE.max}.`,
      });
    } else initialHeight = height;
  }

  // Production: String(label || default).slice(0, 120) — an empty label is the default.
  const label = attributes.label || EMBED_DEFAULT_TITLE;
  if (label.length > EMBED_TITLE_MAX_LENGTH) {
    warnings.push({
      attribute: 'label',
      code: 'label_truncated',
      message: `The label is cut to ${EMBED_TITLE_MAX_LENGTH} characters.`,
    });
  }
  const title = label.slice(0, EMBED_TITLE_MAX_LENGTH);

  return {
    ok: ref !== undefined && errors.length === 0,
    ...(ref ? { ref, segment: embedRefSegment(ref) } : {}),
    variant,
    theme,
    initialHeight,
    title,
    errors,
    warnings,
  };
}

/** An alias of {@link readEmbedAttributes} for authoring tools: same reading, same issues. */
export const validateEmbedAttributes = readEmbedAttributes;

/** A whole number of CSS pixels within {@link EMBED_HEIGHT_RANGE}, or `undefined`. */
export function parseEmbedHeight(value: string | number | null | undefined): number | undefined {
  const text = typeof value === 'number' ? String(value) : (value ?? '').trim();
  if (!/^\d{1,4}$/.test(text)) return undefined;
  const height = Number(text);
  return height >= EMBED_HEIGHT_RANGE.min && height <= EMBED_HEIGHT_RANGE.max ? height : undefined;
}
