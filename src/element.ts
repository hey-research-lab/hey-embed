import {
  EMBED_ELEMENT_ATTRIBUTES,
  EMBED_ELEMENT_NAME,
  EMBED_HEIGHT_MESSAGE,
  EMBED_PACKAGE_ATTRIBUTES,
  EMBED_SANDBOX,
  clampEmbedHeight,
} from './contract';
import { frameUrlFor } from './url';
import { type EmbedAttributeIssue, type EmbedAttributes, readEmbedAttributes } from './validate';

/**
 * `<hey-project>`: one sandboxed iframe pointing at heyresearch.xyz, sized to the variant and
 * resized when that frame — and only that frame, matched by `event.source` — posts its height.
 *
 * It reads its own attributes and nothing else of the host page: no cookie, no storage, no
 * referrer, no location, no query of the document. It sends no request of its own; the frame's
 * load is the only one. The behaviour is production's `/embed/hey-project.js`, held to it by the
 * parity tests.
 */
export interface HeyProjectElement extends HTMLElement {
  /** What the last render refused or ignored (see `readEmbedAttributes`). Never sent anywhere. */
  readonly heyIssues: readonly EmbedAttributeIssue[];
}

/** The few host objects the element touches, injectable for tests. */
export interface HeyProjectEnvironment {
  HTMLElement: typeof HTMLElement;
  document: Pick<Document, 'createElement'>;
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

export const OBSERVED_ATTRIBUTES: readonly string[] = [
  ...EMBED_ELEMENT_ATTRIBUTES,
  ...EMBED_PACKAGE_ATTRIBUTES,
];

const FRAME_STYLE =
  'border:0;width:100%;max-width:100%;display:block;overflow:hidden;color-scheme:normal';

/** Builds the element class over a given environment (the browser's own by default). */
export function createHeyProjectElement(
  env: HeyProjectEnvironment = browserEnvironment(),
): new () => HeyProjectElement {
  const Base = env.HTMLElement;

  class HeyProject extends Base implements HeyProjectElement {
    static get observedAttributes(): readonly string[] {
      return OBSERVED_ATTRIBUTES;
    }

    private frame: HTMLIFrameElement | null = null;
    private reported = false;
    private issues: readonly EmbedAttributeIssue[] = [];

    constructor() {
      super();
      this.onMessage = this.onMessage.bind(this);
    }

    get heyIssues(): readonly EmbedAttributeIssue[] {
      return this.issues;
    }

    connectedCallback(): void {
      env.window.addEventListener('message', this.onMessage);
      this.render();
    }

    disconnectedCallback(): void {
      env.window.removeEventListener('message', this.onMessage);
    }

    attributeChangedCallback(): void {
      if (this.isConnected) this.render();
    }

    private render(): void {
      const attributes: EmbedAttributes = {};
      for (const name of OBSERVED_ATTRIBUTES) {
        attributes[name as keyof EmbedAttributes] = this.getAttribute(name);
      }
      const reading = readEmbedAttributes(attributes);
      this.issues = [...reading.errors, ...reading.warnings];
      // No valid project: the fallback content inside the element stays as it is.
      if (reading.segment === undefined) return;

      const src = frameUrlFor(reading.segment, reading.variant, reading.theme);
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      let frame = this.frame;
      if (!frame) {
        frame = env.document.createElement('iframe');
        frame.setAttribute('loading', 'lazy');
        frame.setAttribute('sandbox', EMBED_SANDBOX);
        frame.style.cssText = FRAME_STYLE;
        root.appendChild(frame);
        this.frame = frame;
        this.style.display = 'block';
      }
      frame.setAttribute('title', reading.title);
      if (frame.getAttribute('src') !== src) {
        this.reported = false;
        frame.style.height = `${reading.initialHeight}px`;
        frame.setAttribute('src', src);
      } else if (!this.reported) {
        frame.style.height = `${reading.initialHeight}px`;
      }
    }

    private onMessage(event: MessageEvent): void {
      // A sandboxed frame has an opaque origin, so the frame is recognised by its window.
      if (!this.frame || event.source !== this.frame.contentWindow) return;
      const data: unknown = event.data;
      if (!data || typeof data !== 'object') return;
      const { type, height } = data as { type?: unknown; height?: unknown };
      if (type !== EMBED_HEIGHT_MESSAGE || typeof height !== 'number' || !isFinite(height)) return;
      this.reported = true;
      this.frame.style.height = `${clampEmbedHeight(height)}px`;
    }
  }

  return HeyProject;
}

function browserEnvironment(): HeyProjectEnvironment {
  return { HTMLElement, document, window };
}

/**
 * Registers `<hey-project>` when the page has a custom-element registry and nothing registered
 * the name yet — production's hosted script included, which speaks the same contract. Harmless to
 * call on a server (it does nothing there) and more than once. True when this call registered it.
 */
export function defineHeyProject(): boolean {
  if (typeof window === 'undefined' || typeof HTMLElement === 'undefined') return false;
  const registry = window.customElements;
  if (!registry || registry.get(EMBED_ELEMENT_NAME)) return false;
  registry.define(EMBED_ELEMENT_NAME, createHeyProjectElement());
  return true;
}

declare global {
  interface HTMLElementTagNameMap {
    'hey-project': HeyProjectElement;
  }
}
