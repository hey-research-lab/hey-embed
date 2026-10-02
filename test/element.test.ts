import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { EMBED_HEIGHT_MESSAGE, EMBED_INITIAL_HEIGHT, EMBED_SANDBOX } from '../src/contract';
import { type HeyProjectEnvironment, createHeyProjectElement } from '../src/element';
import {
  type FakeHost,
  type TestElement,
  fakeHost,
  frameOf,
  mount,
  runScript,
} from './helpers/fake-dom';

/**
 * `<hey-project>` on a host page that throws on anything the element may not touch — and the
 * PARITY check: production's served script (`hey-project.js`, byte for byte) and this package's
 * element, mounted with the same attributes, draw the same frame and resize the same way.
 */
const served = readFileSync(
  fileURLToPath(new URL('./fixtures/production/hey-project.js', import.meta.url)),
  'utf8',
);
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

type Ctor = new () => TestElement;

function ours(host: FakeHost = fakeHost()): { Element: Ctor; host: FakeHost } {
  const env = {
    HTMLElement: host.HTMLElement,
    document: host.document,
    window: host.window,
  } as unknown as HeyProjectEnvironment;
  return { Element: createHeyProjectElement(env) as unknown as Ctor, host };
}

function production(host: FakeHost = fakeHost()): { Element: Ctor; host: FakeHost } {
  runScript(served, host);
  const Element = host.defined.get('hey-project');
  if (!Element) throw new Error('the served script did not define hey-project');
  return { Element, host };
}

const PARITY_CASES: Record<string, string>[] = [
  { project: 'agentos' },
  { project: 'AgentOS', variant: 'changes', theme: 'dark' },
  { project: ' hoodlock ', variant: 'FULL', theme: 'Light' },
  { project: 'hoodlock', variant: 'mega', theme: 'neon' },
  { project: 'hoodlock', label: 'HoodLock on HEY Research Lab' },
  { project: 'hoodlock', label: 'x'.repeat(200) },
  { project: 'hoodlock', label: '' },
  { contract: ADDRESS },
  { contract: `4663:${ADDRESS.toUpperCase().replace('0X', '0x')}`, variant: 'compact' },
  { contract: ADDRESS, project: 'agentos', variant: 'signal' },
  { contract: 'not-an-address', project: 'agentos' },
  { contract: '0x1234', project: 'agentos' },
  { project: ADDRESS },
  { project: '0xzz' },
  { project: 'a'.repeat(120) },
  // Refused by both: the fallback content stays.
  { project: '../admin"><script>' },
  { project: 'a-' },
  { project: 'a'.repeat(121) },
  { project: `4663:${ADDRESS}` },
  { project: '' },
  {},
];

describe('parity: production’s served script and this package draw the same frame', () => {
  for (const attributes of PARITY_CASES) {
    it(JSON.stringify(attributes).slice(0, 100), () => {
      const theirs = mount(production().Element, attributes);
      const mine = mount(ours().Element, attributes);
      expect(frameOf(mine)).toEqual(frameOf(theirs));
      expect(mine.shadowRoot === null).toBe(theirs.shadowRoot === null);
    });
  }

  it('re-renders on attribute changes the same way', () => {
    const theirs = mount(production().Element, { project: 'agentos' });
    const mine = mount(ours().Element, { project: 'agentos' });
    for (const element of [theirs, mine]) {
      element.setAttribute('variant', 'full');
      element.setAttribute('theme', 'dark');
      element.attributeChangedCallback();
    }
    expect(frameOf(mine)).toEqual(frameOf(theirs));
    expect(frameOf(mine)?.src).toBe(
      'https://heyresearch.xyz/embed/project/agentos?variant=full&theme=dark',
    );
  });

  it('resizes to the same messages, clamped the same way', () => {
    const a = production();
    const b = ours();
    const theirs = mount(a.Element, { project: 'agentos' });
    const mine = mount(b.Element, { project: 'agentos' });
    const messages = [
      { own: true, data: { type: EMBED_HEIGHT_MESSAGE, height: 231.4 } },
      { own: false, data: { type: EMBED_HEIGHT_MESSAGE, height: 999 } },
      { own: true, data: { type: 'other', height: 999 } },
      { own: true, data: { type: EMBED_HEIGHT_MESSAGE, height: 'tall' } },
      { own: true, data: { type: EMBED_HEIGHT_MESSAGE, height: Number.POSITIVE_INFINITY } },
      { own: true, data: 'hey-embed:height' },
      { own: true, data: null },
      { own: true, data: { type: EMBED_HEIGHT_MESSAGE, height: 1e9 } },
      { own: true, data: { type: EMBED_HEIGHT_MESSAGE, height: 3 } },
    ];
    for (const message of messages) {
      for (const [host, element] of [
        [a.host, theirs],
        [b.host, mine],
      ] as const) {
        const frame = element.shadowRoot!.children[0]!;
        host.listeners[0]!({ source: message.own ? frame.contentWindow : {}, data: message.data });
      }
      expect(frameOf(mine)?.height).toBe(frameOf(theirs)?.height);
    }
    expect(frameOf(mine)?.height).toBe('60px');
  });
});

describe('<hey-project>', () => {
  it('draws one lazy, sandboxed frame in an open shadow root, and listens once', () => {
    const { Element, host } = ours();
    const element = mount(Element, { project: 'hoodlock', variant: 'changes' });
    expect(frameOf(element)).toMatchObject({
      src: 'https://heyresearch.xyz/embed/project/hoodlock?variant=changes&theme=auto',
      sandbox: EMBED_SANDBOX,
      loading: 'lazy',
      title: 'Project intelligence from HEY Research Lab',
      height: `${EMBED_INITIAL_HEIGHT.changes}px`,
      hostDisplay: 'block',
    });
    expect(host.created).toEqual(['iframe']);
    expect(host.listeners).toHaveLength(1);
    element.disconnectedCallback();
    expect(host.listeners).toHaveLength(0);
  });

  it('reads `slug` as an alias of `project`, and `project` wins', () => {
    const { Element } = ours();
    expect(frameOf(mount(Element, { slug: 'hoodlock' }))?.src).toContain(
      '/embed/project/hoodlock?',
    );
    const both = mount(Element, { slug: 'other', project: 'hoodlock' }) as TestElement & {
      heyIssues: { code: string }[];
    };
    expect(frameOf(both)?.src).toContain('/embed/project/hoodlock?');
    expect(both.heyIssues.map((i) => i.code)).toEqual(['slug_ignored']);
  });

  it('takes a `height` as the first height drawn, until the frame reports its own', () => {
    const { Element, host } = ours();
    const element = mount(Element, { project: 'hoodlock', height: '420' });
    expect(frameOf(element)?.height).toBe('420px');
    const frame = element.shadowRoot!.children[0]!;
    host.listeners[0]!({
      source: frame.contentWindow,
      data: { type: EMBED_HEIGHT_MESSAGE, height: 250 },
    });
    expect(frameOf(element)?.height).toBe('250px');
    element.setAttribute('height', '500');
    element.attributeChangedCallback();
    expect(frameOf(element)?.height).toBe('250px');
    const invalid = mount(Element, { project: 'hoodlock', height: '5' });
    expect(frameOf(invalid)?.height).toBe(`${EMBED_INITIAL_HEIGHT.builder}px`);
  });

  it('refuses another chain and keeps the fallback, saying why', () => {
    const { Element, host } = ours();
    const element = mount(Element, { contract: `8453:${ADDRESS}` }) as TestElement & {
      heyIssues: { code: string; attribute: string }[];
    };
    expect(element.shadowRoot).toBeNull();
    expect(host.created).toEqual([]);
    expect(element.heyIssues).toEqual([
      expect.objectContaining({ attribute: 'contract', code: 'unsupported_chain' }),
    ]);
  });

  it('never treats the zero address as a contract', () => {
    const { Element } = ours();
    expect(mount(Element, { contract: `0x${'0'.repeat(40)}` }).shadowRoot).toBeNull();
  });
});
