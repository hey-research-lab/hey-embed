# Security policy

## Reporting a vulnerability

Please report privately through GitHub's "Report a vulnerability" (Security → Advisories) on this
repository, or email hi@heyresearch.xyz with "security" in the subject. Do not open a public issue.
We aim to acknowledge within 3 working days. There is no bug bounty for this repository.

## Scope

This package runs in other people's pages, so it is built to touch as little as possible:

- **Input it reads:** the `<hey-project>` element's own attributes (`project`, `slug`, `contract`,
  `variant`, `theme`, `label`, `height`) and the arguments of its builder functions. Every value is
  validated against a fixed vocabulary or pattern (slug, Robinhood Chain contract, variant and
  theme enums, height range) before it reaches a URL; anything else is refused or falls back to a
  default. Nothing else of the host page is read: no cookie, storage, referrer, location or
  document query.
- **Output it writes:** one `<iframe>` in the element's shadow root, with a fixed sandbox
  (`allow-scripts allow-popups allow-popups-to-escape-sandbox`, never `allow-same-origin`) and a
  `src` always on `https://heyresearch.xyz`. It never assigns HTML (`innerHTML`, `srcdoc`). Snippet
  builders escape every value they place in markup and JSX.
- **Network:** the package makes no request of its own and contains no analytics. The iframe's load
  is the only request, always to heyresearch.xyz. There is no origin override.
- **Messages:** the element accepts `{ type: 'hey-embed:height', height }` only from its own frame
  (matched by `event.source`), with a finite number, clamped to 60–1200px. It posts nothing.
- **Build and maintenance scripts** (`scripts/`) read only this repository; `refresh-parity.mjs`
  fetches two fixed heyresearch.xyz URLs over https with no redirects, a timeout and a size cap.

Reports about the widget's content, or the heyresearch.xyz routes themselves, are welcome at the
same address.

## Handling secrets

This project never needs HEY credentials, tokens or keys, and reads none from the environment.
Never commit a `.env` with values.

## Supported versions

The latest 0.x minor receives fixes.
