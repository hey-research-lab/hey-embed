# Contributing

Thanks for helping. This package is small on purpose: it is the client side of a contract that
heyresearch.xyz owns, so most changes start with a change in production.

## Setup

```sh
corepack enable
pnpm install
pnpm scan        # leak and attribution scan
pnpm lint
pnpm typecheck
pnpm test        # offline; any network access fails the test run
pnpm build       # tsup, then scripts/check-bundle.mjs runs the <script> bundle on a fake page
```

Node 22 or newer for the tools (the published package supports Node 18+ and current browsers).

## Rules

- No runtime dependencies. React stays an optional peer of the `./react` subpath only.
- The element reads only its own attributes, sends no request of its own and stores nothing.
  `test/hygiene.test.ts` and `scripts/check-bundle.mjs` fail the build otherwise.
- The frame origin is `https://heyresearch.xyz`, fixed. No option may change it.
- Robinhood Chain (4663) only. Other chains are `unsupported_chain`.
- No secrets, tokens or `.env` files with values. Run `pnpm scan` before you push.
- Small conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`).

## Parity with production

The package's vocabulary, URL format, sandbox, resize message and snippets were extracted from
HEY Research Lab's production contract at `21775391f6c0fb4494575e0b4463df535c65cb96`, and
re-checked against production on 2026-10-09: the served `hey-project.js` and `frame.js` are
byte-identical to the fixtures, and the variants, themes, initial heights, sandbox, frame path and
CSP are unchanged. (Production's widget frame now also sends `cache-control: … no-transform`; the
package never sets that header.)

`test/fixtures/production/` records that contract:

| File                      | What it is                                                                                              | Refreshed by                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `hey-project.js`          | the Web Component production serves at https://heyresearch.xyz/embed/hey-project.js, byte for byte      | `pnpm parity:refresh` (anyone)         |
| `frame.js`                | the in-frame resize reporter served at https://heyresearch.xyz/embed/frame.js                           | `pnpm parity:refresh` (anyone)         |
| `contract.json`           | variants, themes, defaults, labels, heights, message type, sandbox, paths, the widget document's policy | a maintainer, from production's source |
| `refs.json`, `parse.json` | production's answers for a table of refs, variants and themes                                           | a maintainer, from production's source |
| `snippets.json`           | production's frame URL, HTML, iframe and React snippets for a table of targets                          | a maintainer, from production's source |

The tests hold the package to them:

- `contract.parity.test.ts` — the constants equal `contract.json` and the values stamped into the
  served `hey-project.js`;
- `ref.parity.test.ts` — refs, variants and themes read as production reads them, with the
  documented Robinhood-Chain-only narrowing;
- `snippets.parity.test.ts` — URLs and snippets byte-identical to production's;
- `element.test.ts` — production's served script and this package's element, mounted on the same
  fake page with the same attributes, draw the same frame and resize the same way.

To check against what production serves today (never in CI):

```sh
pnpm test:live          # compares the served script with the fixture
pnpm parity:refresh     # rewrites hey-project.js / frame.js from heyresearch.xyz when they differ
pnpm test               # shows every place the package no longer matches
```

When production's contract changes, a maintainer with access to production's source regenerates
`contract.json`, `refs.json`, `parse.json` and `snippets.json` from production's own builders, writes
the new commit into `contract.json`'s `source` and into this section, updates the package until the
tests pass, and records the change in `CHANGELOG.md`. A new variant or theme is a minor release;
removing or renaming one is a major release.

Production may later import this package instead of keeping its own copy, which would make the
two implementations one; until then the parity tests are what keeps them in step.
