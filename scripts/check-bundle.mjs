#!/usr/bin/env node
// Post-build check of the <script> bundle (dist/hey-embed.iife.js): it runs on a fake host page
// whose window and document throw on anything but what the element may touch, registers
// <hey-project>, exposes window.HeyEmbed, draws the frame production would draw, stays small, and
// holds none of the words of a script that reads the page, stores or calls out.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const BUNDLE = 'dist/hey-embed.iife.js';
const MAX_BYTES = 16 * 1024;
const FORBIDDEN = [
  'cookie',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'referrer',
  'location',
  'querySelector',
  'innerHTML',
  'fetch(',
  'XMLHttpRequest',
  'sendBeacon',
  'WebSocket',
  'navigator',
  'eval(',
  'Function(',
  'allow-same-origin',
];

const fail = (message) => {
  console.error(`check-bundle: ${message}`);
  process.exit(1);
};
const source = readFileSync(BUNDLE, 'utf8');
if (Buffer.byteLength(source) > MAX_BYTES)
  fail(`${BUNDLE} is ${Buffer.byteLength(source)} bytes (budget ${MAX_BYTES})`);
for (const word of FORBIDDEN) if (source.includes(word)) fail(`${BUNDLE} contains "${word}"`);
if (
  /https?:\/\/(?!heyresearch\.xyz)[a-z0-9.-]+\.[a-z]{2,}/i.test(
    source.replace(/https:\/\/robinhoodchain\.blockscout\.com/g, ''),
  )
) {
  fail(`${BUNDLE} names an origin other than heyresearch.xyz`);
}

const strict = (target, allowed, name) =>
  new Proxy(target, {
    get(object, property) {
      if (typeof property === 'string' && !allowed.includes(property))
        fail(`the bundle read ${name}.${property}`);
      return Reflect.get(object, property);
    },
  });
class Node {
  attributes = new Map();
  children = [];
  style = {};
  contentWindow = {};
  getAttribute(n) {
    return this.attributes.has(n) ? this.attributes.get(n) : null;
  }
  setAttribute(n, v) {
    this.attributes.set(n, String(v));
  }
  appendChild(c) {
    this.children.push(c);
    return c;
  }
}
class HTMLElement extends Node {
  isConnected = true;
  shadowRoot = null;
  attachShadow() {
    this.shadowRoot = new Node();
    return this.shadowRoot;
  }
}
const defined = new Map();
const listeners = [];
const customElements = strict(
  { get: (t) => defined.get(t), define: (t, c) => defined.set(t, c) },
  ['get', 'define'],
  'customElements',
);
const window = strict(
  {
    customElements,
    addEventListener: (t, l) => t === 'message' && listeners.push(l),
    removeEventListener: () => {},
  },
  ['customElements', 'addEventListener', 'removeEventListener'],
  'window',
);
const document = strict({ createElement: () => new Node() }, ['createElement'], 'document');
const context = { window, document, HTMLElement, URLSearchParams };
vm.runInNewContext(source, context);

const Element = defined.get('hey-project');
if (!Element) fail('the bundle did not register <hey-project>');
if (typeof context.HeyEmbed?.embedFrameUrl !== 'function')
  fail('window.HeyEmbed.embedFrameUrl is missing');
const element = new Element();
element.setAttribute('project', 'hoodlock');
element.setAttribute('variant', 'compact');
element.connectedCallback();
const frame = element.shadowRoot?.children[0];
const expected = 'https://heyresearch.xyz/embed/project/hoodlock?variant=compact&theme=auto';
if (frame?.getAttribute('src') !== expected)
  fail(`frame src ${frame?.getAttribute('src')} !== ${expected}`);
if (frame.getAttribute('sandbox') !== 'allow-scripts allow-popups allow-popups-to-escape-sandbox')
  fail('wrong sandbox');
listeners[0]({ source: frame.contentWindow, data: { type: 'hey-embed:height', height: 5000 } });
if (frame.style.height !== '1200px') fail(`height not clamped: ${frame.style.height}`);
console.log(`check-bundle: ${BUNDLE} ok (${Buffer.byteLength(source)} bytes)`);
