import {
  EMBED_HEIGHT_MESSAGE,
  EMBED_HEIGHT_RANGE,
  EMBED_INITIAL_HEIGHT,
  EMBED_SANDBOX,
  EMBED_SCRIPT_URL,
  HEY_ORIGIN,
  type EmbedTheme,
  type EmbedVariant,
} from './contract';
import { HeyEmbedError, embedRefSegment, toEmbedRef } from './ref';
import { embedFrameUrl, projectPageUrl } from './url';
import { parseEmbedHeight } from './validate';

/**
 * Copy-paste snippets, spelled exactly as https://heyresearch.xyz/developers/embeds hands them out
 * (the parity tests compare them with production's output byte for byte).
 */
export interface SnippetTarget {
  /** A slug, `0x…` or `4663:0x…`. */
  ref: string;
  /** The project's slug when known, for the fallback link. */
  slug?: string;
  /** The project's name, for the frame's accessible title and the fallback link text. */
  name?: string;
  variant: EmbedVariant;
  theme: EmbedTheme;
}

const attr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function frameTitle(target: SnippetTarget): string {
  return target.name
    ? `${target.name} on HEY Research Lab`
    : 'Project intelligence from HEY Research Lab';
}

function checkedSegment(target: SnippetTarget): string {
  // Validates the ref (Robinhood Chain only) and keeps its spelling.
  return embedRefSegment(toEmbedRef(target.ref));
}

function checkedHeight(height: number | undefined, variant: EmbedVariant): number {
  if (height === undefined) return EMBED_INITIAL_HEIGHT[variant];
  const parsed = parseEmbedHeight(height);
  if (parsed === undefined) {
    throw new HeyEmbedError(
      'invalid_height',
      `height must be a whole number from ${EMBED_HEIGHT_RANGE.min} to ${EMBED_HEIGHT_RANGE.max}.`,
    );
  }
  return parsed;
}

/** An `https:` script address with no credentials, for a self-hosted copy of the bundle. */
function checkedScriptSrc(src: string | undefined): string {
  if (src === undefined) return EMBED_SCRIPT_URL;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    throw new HeyEmbedError('invalid_script_src', 'scriptSrc must be an absolute https: URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new HeyEmbedError(
      'invalid_script_src',
      'scriptSrc must be an https: URL without credentials.',
    );
  }
  return url.href;
}

export interface HtmlSnippetOptions {
  /**
   * Where the page loads the element from. Default: production's hosted script
   * (`https://heyresearch.xyz/embed/hey-project.js`). Pass a pinned CDN or self-hosted copy of
   * this package's `dist/hey-embed.iife.js` instead; both speak the same contract.
   */
  scriptSrc?: string;
}

/**
 * The Web Component: one async script and one element, with a link inside that readers see
 * wherever scripts do not run.
 */
export function htmlSnippet(target: SnippetTarget, options: HtmlSnippetOptions = {}): string {
  const segment = checkedSegment(target);
  const fallbackHref = target.slug ? projectPageUrl(target.slug) : HEY_ORIGIN;
  const refAttribute = /^(?:\d+:)?0x[0-9a-f]{40}$/i.test(segment)
    ? `contract="${attr(segment)}"`
    : `project="${attr(segment)}"`;
  return [
    `<script src="${attr(checkedScriptSrc(options.scriptSrc))}" async></script>`,
    `<hey-project ${refAttribute} variant="${target.variant}" theme="${target.theme}">`,
    `  <a href="${attr(fallbackHref)}">${attr(frameTitle(target))}</a>`,
    `</hey-project>`,
  ].join('\n');
}

/** A plain sandboxed iframe for pages that allow no script: fixed height, no resizing. */
export function iframeSnippet(target: SnippetTarget, height?: number): string {
  const src = embedFrameUrl(checkedSegment(target), target);
  return `<iframe src="${attr(src)}" title="${attr(frameTitle(target))}" width="100%" height="${checkedHeight(height, target.variant)}" loading="lazy" sandbox="${EMBED_SANDBOX}" style="border:0;display:block;max-width:100%"></iframe>`;
}

/**
 * A self-contained React component with no package to install, as the configurator hands it out.
 * Every value sits inside a JavaScript string, because a JSX attribute has no escapes. With this
 * package installed, `@hey-research-lab/embed/react` is the shorter route.
 */
export function reactSnippet(target: SnippetTarget, height?: number): string {
  const src = embedFrameUrl(checkedSegment(target), target);
  return `import { useEffect, useRef, useState } from 'react';

// HEY Research Lab project intelligence, from ${HEY_ORIGIN}/developers/embeds
export function HeyProject() {
  const frame = useRef(null);
  const [height, setHeight] = useState(${checkedHeight(height, target.variant)});

  useEffect(() => {
    const onMessage = (event) => {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const data = event.data;
      if (data && data.type === '${EMBED_HEIGHT_MESSAGE}' && typeof data.height === 'number') {
        setHeight(Math.min(Math.max(Math.ceil(data.height), ${EMBED_HEIGHT_RANGE.min}), ${EMBED_HEIGHT_RANGE.max}));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={frame}
      src={${JSON.stringify(src)}}
      title={${JSON.stringify(frameTitle(target))}}
      height={height}
      loading="lazy"
      sandbox="${EMBED_SANDBOX}"
      style={{ border: 0, width: '100%', display: 'block' }}
    />
  );
}
`;
}

/** The `<script>` tag alone, for production's hosted copy or a pinned one. */
export function scriptTag(options: HtmlSnippetOptions & { integrity?: string } = {}): string {
  const src = attr(checkedScriptSrc(options.scriptSrc));
  if (!options.integrity) return `<script src="${src}" async></script>`;
  if (!/^sha(256|384|512)-[A-Za-z0-9+/]+={0,2}$/.test(options.integrity)) {
    throw new HeyEmbedError('invalid_script_src', 'integrity must be a sha256/384/512 SRI hash.');
  }
  return `<script src="${src}" integrity="${options.integrity}" crossorigin="anonymous" async></script>`;
}
