import vm from 'node:vm';

/**
 * A minimal host page whose `window` and `document` throw on anything but the members an embed
 * element is allowed to touch. A script that reached for `document.cookie`, `location`,
 * `localStorage`, `document.referrer` or a query of the page would throw here. The same fakes run
 * production's served script (the parity fixture) and this package's element, so both are held to
 * one behaviour.
 */
export type Listener = (event: { source: unknown; data: unknown }) => void;

export class FakeNode {
  readonly attributes = new Map<string, string>();
  readonly children: FakeNode[] = [];
  readonly style: Record<string, string> = {};
  contentWindow: object = {};
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }
  appendChild(child: FakeNode): FakeNode {
    this.children.push(child);
    return child;
  }
}

export class FakeElement extends FakeNode {
  isConnected = true;
  shadowRoot: FakeNode | null = null;
  attachShadow(init: { mode: string }): FakeNode {
    if (init.mode !== 'open') throw new Error('expected an open shadow root');
    this.shadowRoot = new FakeNode();
    return this.shadowRoot;
  }
}

export interface TestElement extends FakeElement {
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(): void;
}

export function strict<T extends object>(target: T, allowed: readonly string[], name: string): T {
  return new Proxy(target, {
    get(object, property) {
      if (typeof property === 'string' && !allowed.includes(property)) {
        throw new Error(`${name}.${property} is not something the script may read`);
      }
      return Reflect.get(object, property);
    },
    set(object, property, value) {
      if (typeof property === 'string' && !allowed.includes(property)) {
        throw new Error(`${name}.${property} is not something the script may write`);
      }
      return Reflect.set(object, property, value);
    },
  });
}

type Constructor = new () => TestElement;

export interface FakeHost {
  window: {
    customElements: {
      get(tag: string): Constructor | undefined;
      define(tag: string, c: Constructor): void;
    };
    addEventListener(type: string, listener: Listener): void;
    removeEventListener(type: string, listener: Listener): void;
  };
  document: { createElement(tag: string): FakeNode };
  HTMLElement: typeof FakeElement;
  listeners: Listener[];
  defined: Map<string, Constructor>;
  created: string[];
}

export function fakeHost(): FakeHost {
  const defined = new Map<string, Constructor>();
  const listeners: Listener[] = [];
  const created: string[] = [];
  const customElements = strict(
    {
      get: (tag: string) => defined.get(tag),
      define: (tag: string, constructor: Constructor) => void defined.set(tag, constructor),
    },
    ['get', 'define'],
    'customElements',
  );
  const window = strict(
    {
      customElements,
      addEventListener: (type: string, listener: Listener) => {
        if (type === 'message') listeners.push(listener);
      },
      removeEventListener: (type: string, listener: Listener) => {
        const index = listeners.indexOf(listener);
        if (type === 'message' && index >= 0) listeners.splice(index, 1);
      },
    },
    ['customElements', 'addEventListener', 'removeEventListener'],
    'window',
  );
  const document = strict(
    {
      createElement: (tag: string) => {
        created.push(tag);
        return new FakeNode();
      },
    },
    ['createElement'],
    'document',
  );
  return { window, document, HTMLElement: FakeElement, listeners, defined, created };
}

/** Runs a classic script (production's `hey-project.js`, or this package's IIFE) on a fake host. */
export function runScript(
  source: string,
  host: FakeHost,
  extra: Record<string, unknown> = {},
): void {
  vm.runInNewContext(source, {
    window: host.window,
    document: host.document,
    HTMLElement: host.HTMLElement,
    isFinite,
    Math,
    String,
    encodeURIComponent,
    URLSearchParams,
    ...extra,
  });
}

/** A connected element with the given attributes. */
export function mount(Element: Constructor, attributes: Record<string, string>): TestElement {
  const element = new Element();
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  element.connectedCallback();
  return element;
}

/** What a host page can observe of an element's frame. */
export function frameOf(element: TestElement) {
  const frame = element.shadowRoot?.children[0];
  if (!frame) return null;
  return {
    src: frame.getAttribute('src'),
    sandbox: frame.getAttribute('sandbox'),
    loading: frame.getAttribute('loading'),
    title: frame.getAttribute('title'),
    height: frame.style.height,
    cssText: frame.style.cssText,
    hostDisplay: element.style.display,
  };
}
