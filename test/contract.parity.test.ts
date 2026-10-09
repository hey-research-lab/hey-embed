import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EMBED_THEME,
  DEFAULT_EMBED_VARIANT,
  EMBED_DEFAULT_TITLE,
  EMBED_ELEMENT_ATTRIBUTES,
  EMBED_ELEMENT_NAME,
  EMBED_FRAME_PATH_PREFIX,
  EMBED_HEIGHT_MESSAGE,
  EMBED_HEIGHT_RANGE,
  EMBED_INITIAL_HEIGHT,
  EMBED_SANDBOX,
  EMBED_SCRIPT_PATH,
  EMBED_THEMES,
  EMBED_UTM_SOURCE,
  EMBED_VARIANTS,
  EMBED_VARIANT_LABELS,
  HEY_ORIGIN,
} from '../src/contract';

/**
 * PARITY: the package's vocabulary equals production's public contract.
 *
 * `test/fixtures/production/contract.json` is copied from HEY Research Lab's production embed
 * contract at the commit it names; `hey-project.js` is the script production serves at
 * https://heyresearch.xyz/embed/hey-project.js, byte for byte. A change in either fails here until
 * this package follows it. CONTRIBUTING.md says how to refresh them.
 */
const fixture = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`./fixtures/production/${name}`, import.meta.url)), 'utf8');

const contract = JSON.parse(fixture('contract.json')) as Record<string, unknown>;
const served = fixture('hey-project.js');

/** The `var NAME = <json>;` constants production stamps into its served script. */
function stamped(name: string): unknown {
  const match = new RegExp(`var ${name} = (.+?);\\n`).exec(served);
  if (!match?.[1]) throw new Error(`the served script no longer stamps ${name}`);
  return JSON.parse(match[1]) as unknown;
}

describe('parity with the recorded production contract (contract.json)', () => {
  it('records where it came from', () => {
    expect(contract.source).toMatch(
      /^HEY Research Lab production embed contract, recorded \d{4}-\d{2}-\d{2}/,
    );
  });

  it('has the same origin, element, paths and sandbox', () => {
    expect(contract.origin).toBe(HEY_ORIGIN);
    expect(contract.elementName).toBe(EMBED_ELEMENT_NAME);
    expect(contract.elementAttributes).toEqual([...EMBED_ELEMENT_ATTRIBUTES]);
    expect(contract.scriptPath).toBe(EMBED_SCRIPT_PATH);
    expect(contract.framePath).toBe(`${EMBED_FRAME_PATH_PREFIX}{ref}`);
    expect(contract.frameQuery).toEqual(['variant', 'theme']);
    expect(contract.sandbox).toBe(EMBED_SANDBOX);
    expect(contract.defaultFrameTitle).toBe(EMBED_DEFAULT_TITLE);
  });

  it('has the same variants, themes and defaults, in order', () => {
    expect(contract.variants).toEqual([...EMBED_VARIANTS]);
    expect(contract.themes).toEqual([...EMBED_THEMES]);
    expect(contract.defaultVariant).toBe(DEFAULT_EMBED_VARIANT);
    expect(contract.defaultTheme).toBe(DEFAULT_EMBED_THEME);
    expect(contract.variantLabels).toEqual(EMBED_VARIANT_LABELS);
  });

  it('has the same heights, height message and attribution source', () => {
    expect(contract.initialHeights).toEqual(EMBED_INITIAL_HEIGHT);
    expect(contract.heightRange).toEqual(EMBED_HEIGHT_RANGE);
    expect(contract.heightMessage).toBe(EMBED_HEIGHT_MESSAGE);
    expect(contract.utmSource).toBe(EMBED_UTM_SOURCE);
  });

  it('documents the widget document policy this package tells hosts about', () => {
    expect(contract.frameContentSecurityPolicy).toContain('frame-ancestors *');
    expect(contract.frameContentSecurityPolicy).toContain("connect-src 'none'");
    expect(contract.scriptHeaders).toMatchObject({
      'content-type': 'text/javascript; charset=utf-8',
      'access-control-allow-origin': '*',
      'cross-origin-resource-policy': 'cross-origin',
    });
  });
});

describe('parity with the script production serves (hey-project.js)', () => {
  it('stamps the same origin and vocabulary', () => {
    expect(stamped('ORIGIN')).toBe(HEY_ORIGIN);
    expect(stamped('VARIANTS')).toEqual([...EMBED_VARIANTS]);
    expect(stamped('THEMES')).toEqual([...EMBED_THEMES]);
    expect(stamped('DEFAULT_VARIANT')).toBe(DEFAULT_EMBED_VARIANT);
    expect(stamped('DEFAULT_THEME')).toBe(DEFAULT_EMBED_THEME);
    expect(stamped('HEIGHTS')).toEqual(EMBED_INITIAL_HEIGHT);
    expect(stamped('MESSAGE')).toBe(EMBED_HEIGHT_MESSAGE);
    expect(served).toContain(
      `var MIN = ${EMBED_HEIGHT_RANGE.min}, MAX = ${EMBED_HEIGHT_RANGE.max};`,
    );
  });

  it('observes the same attributes and draws the same sandbox', () => {
    const observed = /observedAttributes\(\) \{ return (\[.*?\]); \}/.exec(served)?.[1];
    expect(JSON.parse((observed ?? '[]').replace(/'/g, '"'))).toEqual([
      ...EMBED_ELEMENT_ATTRIBUTES,
    ]);
    expect(served).toContain(`frame.setAttribute('sandbox', '${EMBED_SANDBOX}')`);
    expect(served).toContain(`'${EMBED_DEFAULT_TITLE}'`);
    expect(served).toContain(`window.customElements.define('${EMBED_ELEMENT_NAME}', HeyProject)`);
  });
});
