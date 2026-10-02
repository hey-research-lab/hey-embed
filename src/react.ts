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
import { readEmbedRef } from './ref';
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
    props.children ?? fallbackLink(props.contract, project, props.label),
  );
}

/**
 * The server-rendered link readers without scripts get: the contract's page on HEY when a valid
 * contract is given (it wins, as on the element; 0.1.1), else the project's page, else HEY.
 */
function fallbackLink(
  contract: string | undefined,
  project: string | undefined,
  label: string | undefined,
): ReactElement {
  const fromContract = contract === undefined ? undefined : readEmbedRef(contract);
  const read = fromContract?.ok
    ? fromContract
    : project === undefined
      ? undefined
      : readEmbedRef(project);
  if (read?.ok && read.ref.kind === 'contract') {
    const { chainId, address } = read.ref;
    const text = label ?? `${address.slice(0, 6)}…${address.slice(-4)} on HEY Research Lab`;
    return createElement('a', { href: `${HEY_ORIGIN}/token/${chainId}/${address}` }, text);
  }
  if (read?.ok && read.ref.kind === 'slug') {
    const slug = read.ref.slug;
    return createElement(
      'a',
      { href: projectPageUrl(slug) },
      label ?? `${slug} on HEY Research Lab`,
    );
  }
  return createElement('a', { href: HEY_ORIGIN }, label ?? EMBED_DEFAULT_TITLE);
}

export type { EmbedTheme, EmbedVariant } from './contract';
