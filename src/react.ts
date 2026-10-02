/**
 * `@hey-research-lab/embed/react`: a thin React wrapper around `<hey-project>`.
 *
 * It renders the custom element with its attributes and a fallback link (server-rendered, so a
 * reader without scripts still gets the link), and registers the element in an effect — so it is
 * usable in server rendering and in Next.js server components. React is an optional peer dependency.
 */
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  createElement,
  useEffect,
} from 'react';

import {
  EMBED_DEFAULT_TITLE,
  EMBED_ELEMENT_NAME,
  HEY_ORIGIN,
  type EmbedTheme,
  type EmbedVariant,
} from './contract';
import { defineHeyProject } from './element';
import { EMBED_SLUG_RE } from './ref';
import { projectPageUrl } from './url';

export interface HeyProjectProps {
  /** The project's HEY slug. */
  project?: string;
  /** Alias of `project`; rendered as the `project` attribute so the hosted script reads it too. */
  slug?: string;
  /** A Robinhood Chain contract: `0x…` or `4663:0x…`. Wins over `project` when valid. */
  contract?: string;
  variant?: EmbedVariant;
  theme?: EmbedTheme;
  /** The height first drawn, in CSS pixels (60–1200), before the frame reports its own. */
  height?: number;
  /** The frame's accessible title. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** What readers see where scripts do not run. Default: a link to the project on heyresearch.xyz. */
  children?: ReactNode;
}

export function HeyProject(props: HeyProjectProps): ReactElement {
  useEffect(() => {
    defineHeyProject();
  }, []);

  const project = props.project ?? props.slug;
  const attributes: Record<string, string | CSSProperties> = {};
  if (project !== undefined) attributes.project = project;
  if (props.contract !== undefined) attributes.contract = props.contract;
  if (props.variant !== undefined) attributes.variant = props.variant;
  if (props.theme !== undefined) attributes.theme = props.theme;
  if (props.height !== undefined) attributes.height = String(props.height);
  if (props.label !== undefined) attributes.label = props.label;
  // React 18 writes `className` literally on a custom element; `class` works in 18 and 19.
  if (props.className !== undefined) attributes.class = props.className;
  if (props.style !== undefined) attributes.style = props.style;

  return createElement(
    EMBED_ELEMENT_NAME,
    attributes,
    props.children ?? fallbackLink(project, props.label),
  );
}

function fallbackLink(project: string | undefined, label: string | undefined): ReactElement {
  const slug = project?.trim().toLowerCase();
  const valid = slug !== undefined && EMBED_SLUG_RE.test(slug);
  const href = valid ? projectPageUrl(slug) : HEY_ORIGIN;
  const text = label ?? (valid ? `${slug} on HEY Research Lab` : EMBED_DEFAULT_TITLE);
  return createElement('a', { href }, text);
}

export type { EmbedTheme, EmbedVariant } from './contract';
