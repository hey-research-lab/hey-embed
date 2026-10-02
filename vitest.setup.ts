/**
 * No test may touch the network.
 *
 * Every test runs over saved fixtures. The one exception is `test/live.test.ts`, which compares the
 * fixture with the script heyresearch.xyz serves today; it runs only with HEY_LIVE=1 and never in CI.
 */
const blocked = async (input: unknown): Promise<never> => {
  const target = typeof input === 'string' ? input : String(input);
  throw new Error(
    `Network access is disabled in tests. Something tried to fetch ${target}. ` +
      'Run the live parity check with HEY_LIVE=1 (pnpm test:live).',
  );
};

if (process.env.HEY_LIVE !== '1') {
  globalThis.fetch = blocked as unknown as typeof fetch;
}
