import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Opt-in live PARITY check (HEY_LIVE=1, `pnpm test:live`; never in CI): the script production
 * serves today equals the fixture the offline tests are held to. A difference means production's
 * contract moved: run `pnpm parity:refresh`, then `pnpm test`, and follow what fails.
 */
const live = process.env.HEY_LIVE === '1';

describe.skipIf(!live)('live parity with heyresearch.xyz', () => {
  it('serves the script the fixture records', async () => {
    const response = await fetch('https://heyresearch.xyz/embed/hey-project.js', {
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    const fixture = readFileSync(
      fileURLToPath(new URL('./fixtures/production/hey-project.js', import.meta.url)),
      'utf8',
    );
    expect(await response.text()).toBe(fixture);
  });
});
