# hey-embed

A dependency-free `<hey-project>` Web Component, URL builder and attribute validator for embedding
HEY Research Lab's builder evidence widgets — every widget is served by https://heyresearch.xyz.

[![CI](https://github.com/hey-research-lab/hey-embed/actions/workflows/ci.yml/badge.svg)](https://github.com/hey-research-lab/hey-embed/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-informational.svg)](package.json)
[![Robinhood Chain 4663](https://img.shields.io/badge/Robinhood%20Chain-4663-informational.svg)](#why-robinhood-chain-only)

## Why it exists

heyresearch.xyz already serves embeddable widgets that show what a Robinhood Chain project has
shipped: its activity status, latest ship, recent changes and signals about building. This
package is the client side of that contract as a versioned npm package: the element, the URL
builder, the attribute rules, a React wrapper and the copy-paste snippets — so a site can bundle,
pin and audit the code it runs instead of loading a script that may change. It renders no
research itself: the widget's content always comes from heyresearch.xyz.

## Why Robinhood Chain only

HEY Research Lab researches Robinhood Chain (chain id `4663`, CAIP-2 `eip155:4663`) only. A
contract ref is `0x…` or `4663:0x…`; any other chain is refused with `unsupported_chain`, and the
element shows its fallback content instead of a frame.

## Install

```sh
npm i @hey-research-lab/embed
```

or, with no build step, one script tag (see [Hosted script or npm package](#hosted-script-or-npm-package--one-contract)):

```html
<script src="https://heyresearch.xyz/embed/hey-project.js" async></script>
```

## Smallest working example

```html
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@hey-research-lab/embed@0.1.0/dist/index.js';
</script>

<hey-project project="hoodlock" variant="builder" theme="auto">
  <a href="https://heyresearch.xyz/project/hoodlock">HoodLock on HEY Research Lab</a>
</hey-project>
```

In a bundled app, `import '@hey-research-lab/embed';` registers the element in the browser (and
does nothing on a server). The link inside the element is what readers see where scripts do not
run. More: [`examples/plain-html`](examples/plain-html/index.html),
[`examples/react`](examples/react/HeyWidget.tsx), [`examples/nextjs`](examples/nextjs).

## Usage

### Attributes

| Attribute  | Values                                          | Default                  | Notes                                                                                                 |
| ---------- | ----------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `project`  | a HEY slug: `a-z`, `0-9`, inner `-`, 1–120 long | —                        | Case and surrounding spaces are ignored.                                                              |
| `contract` | `0x` + 40 hex, or `4663:0x…`                    | —                        | Wins over `project` when valid. Zero and dead addresses are refused.                                  |
| `variant`  | `compact` `builder` `changes` `full` `signal`   | `builder`                | An unknown value falls back to the default.                                                           |
| `theme`    | `light` `dark` `auto`                           | `auto`                   | `auto` follows the reader's colour scheme.                                                            |
| `label`    | text                                            | "Project intelligence…"  | The frame's accessible title; cut to 120 characters.                                                  |
| `slug`     | alias of `project`                              | —                        | This package only; `project` wins when both are set.                                                  |
| `height`   | whole pixels, 60–1200                           | the variant's own height | This package only: the height drawn before the frame reports its own. It never changes the frame URL. |

| Variant   | Shows                                                                                   | First height |
| --------- | --------------------------------------------------------------------------------------- | -----------: |
| `compact` | name, activity status and the latest ship, in one line                                  |        120px |
| `builder` | status, latest ship, meaningful ships in 30 days and whether HEY verified the builder   |        196px |
| `changes` | the newest changes HEY recorded for the project, with how many there are in all         |        280px |
| `full`    | the research summary line, the builder facts and the latest change                      |        340px |
| `signal`  | the newest HEY Signal about building or contracts (market signals are never shown here) |        176px |

The frame reports its real height with `postMessage({ type: 'hey-embed:height', height })`; the
element accepts it only from its own frame (matched by `event.source`) and clamps it to 60–1200px.

### What the element does — and does not

It reads its own attributes and nothing else of your page: no cookie, storage, referrer, location
or document query. It draws one `<iframe>` in an open shadow root, with
`sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` and `loading="lazy"`, pointed
at `https://heyresearch.xyz/embed/project/{ref}?variant=…&theme=…`. It sends no request of its own
and contains no analytics: the frame's load is the only request. Like any frame, that request
carries the `Referer` your page's referrer policy allows (by default your origin only), which
heyresearch.xyz uses to label the widget's link back and to count a bare impression per host
domain. A page with `Referrer-Policy: no-referrer` sends none.

`element.heyIssues` lists what the last render refused or ignored (see `validateEmbedAttributes`).

### Hosted script or npm package — one contract

|              | Production's hosted script                                                                | This package                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Load         | `<script src="https://heyresearch.xyz/embed/hey-project.js" async>`                       | `import '@hey-research-lab/embed'`, or `dist/hey-embed.iife.js` from a pinned CDN URL or your own host |
| Version      | always the current contract; served with `cache-control: public, max-age=3600`, so no SRI | SemVer; pin it and add `integrity`                                                                     |
| `script-src` | `https://heyresearch.xyz`                                                                 | `'self'` (bundled) or the CDN you pin                                                                  |
| Frames       | `https://heyresearch.xyz/embed/project/{ref}`                                             | the same URL, byte for byte                                                                            |

Both register the same `<hey-project>` element. Whichever loads first defines it and the other
steps aside, so a page that loads both still works. Markup written for one works with the other —
use `project`, not `slug`, if the page may load the hosted script. The parity tests hold this
package to production's served script (see [CONTRIBUTING.md](CONTRIBUTING.md)).

Differences, all deliberate:

- **Robinhood Chain only.** The hosted script frames a `<chainId>:0x…` for any chain id (and
  `04663:` as 4663); this package refuses anything but `0x…` and `4663:0x…` with
  `unsupported_chain`, and refuses the zero and dead addresses, showing the fallback instead.
- **Two additions:** `slug` (an alias of `project`) and `height` (the first height drawn). Neither
  changes the frame URL; the hosted script ignores both.
- **Reports issues** on `element.heyIssues` (locally; nothing is sent).

### JavaScript API

```ts
import {
  embedFrameUrl,
  validateEmbedAttributes,
  htmlSnippet,
  iframeSnippet,
  reactSnippet,
  scriptTag,
  readEmbedRef,
  defineHeyProject,
  EMBED_VARIANTS,
  EMBED_THEMES,
  EMBED_SANDBOX,
} from '@hey-research-lab/embed';

embedFrameUrl('hoodlock', { variant: 'compact', theme: 'dark' });
// → 'https://heyresearch.xyz/embed/project/hoodlock?variant=compact&theme=dark'

embedFrameUrl('8453:0x1234567890abcdef1234567890abcdef12345678');
// throws HeyEmbedError { code: 'unsupported_chain' }

validateEmbedAttributes({ project: 'Hood Lock', variant: 'mega' });
// → { ok: false, variant: 'builder', errors: [{ attribute: 'project', code: 'invalid_slug', … },
//                                              { attribute: 'variant', code: 'invalid_variant', … }], … }

htmlSnippet({
  ref: 'hoodlock',
  slug: 'hoodlock',
  name: 'HoodLock',
  variant: 'builder',
  theme: 'auto',
});
// the same snippet https://heyresearch.xyz/developers/embeds hands out
```

| Export                                                            | What it does                                                                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `embedFrameUrl(ref, { variant?, theme? })`                        | The widget URL on heyresearch.xyz. Strict: throws `HeyEmbedError` for a bad ref, variant or theme.                                      |
| `projectPageUrl(slug)`                                            | `https://heyresearch.xyz/project/{slug}`, for a fallback link.                                                                          |
| `readEmbedRef(raw, { decode? })` / `parseEmbedRef` / `toEmbedRef` | Read a slug or contract; `{ ok, ref }` or `{ ok: false, code, message }`.                                                               |
| `validateEmbedAttributes(attrs)`                                  | Reads attributes exactly as the element does; returns the resolved ref, variant, theme, height, title, `errors[]`, `warnings[]`.        |
| `htmlSnippet`, `iframeSnippet`, `reactSnippet`                    | Copy-paste snippets, byte-identical to production's configurator. `htmlSnippet(t, { scriptSrc })` points at a pinned copy (https only). |
| `scriptTag({ scriptSrc?, integrity? })`                           | A `<script>` tag, with SRI when given a hash.                                                                                           |
| `defineHeyProject()` / `createHeyProjectElement(env?)`            | Register the element (no-op on a server or when already defined) / build the class over an injected environment.                        |
| `EMBED_*`, `HEY_ORIGIN`, `CHAIN_ID`                               | The contract's constants.                                                                                                               |

Error codes: `missing_ref`, `invalid_ref`, `invalid_slug`, `invalid_address`, `unsupported_chain`,
`not_a_contract_identity`, `invalid_variant`, `invalid_theme`, `invalid_height`,
`invalid_script_src`. Warning codes: `slug_ignored`, `project_ignored`, `contract_in_project`,
`label_truncated`.

The `<script>` bundle (`dist/hey-embed.iife.js`, ~12 KB) registers the element on load and exposes
the same functions as `window.HeyEmbed`.

### React and Next.js

```tsx
import { HeyProject } from '@hey-research-lab/embed/react';

<HeyProject project="hoodlock" variant="changes" theme="auto" />;
```

`react` (17, 18 or 19) is an optional peer dependency used only by this subpath. The wrapper renders
`<hey-project>` with a fallback link — server-rendered, so readers without scripts get the link —
and registers the element in an effect. The module is marked `'use client'`, so a Next.js server
component can render it directly. Props: `project`, `slug`, `contract`, `variant`, `theme`,
`height`, `label`, `className`, `style`, `children` (custom fallback).

### Sandbox

Use exactly `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` on any frame of
`/embed/project/…` — it is what production's element and snippets use, and all the widget needs.
Do not add `allow-same-origin`. Details: [docs/sandbox.md](docs/sandbox.md).

### Content Security Policy

Your page needs `frame-src https://heyresearch.xyz` and a `script-src` that allows where the element
comes from (`https://heyresearch.xyz` for the hosted script; nothing extra when bundled; the CDN
host when pinned there). No `connect-src`, `img-src` or `style-src` entry is needed. Details,
including Trusted Types and the widget document's own policy: [docs/csp.md](docs/csp.md).

## How it relates to HEY Research Lab

The widgets are rendered by heyresearch.xyz from HEY's own records; this package only points a
sandboxed frame at them, and has no runtime dependency on any other HEY package. Production's
`/embed/hey-project.js` and this package speak one contract: the vocabulary, URL format, sandbox
and resize message here are extracted from HEY Research Lab's production contract and held to it by
parity tests over recorded fixtures. Which projects appear, and what a widget says about them, is
decided by HEY's own research and quality rules, never by this package. Configurator:
https://heyresearch.xyz/developers/embeds. Public API: https://heyresearch.xyz/docs/public-api.

## What it does NOT prove

The widget shows HEY's builder evidence for a project, rendered by heyresearch.xyz. Embedding it is not an endorsement by HEY, and it says nothing about a token's price, safety or future.

HEY Research Lab is an independent research project and is not affiliated with, endorsed by or partnered with Robinhood Markets, Inc. or Robinhood Chain.

## Security

See [SECURITY.md](SECURITY.md). The package reads only its element's attributes, writes no
storage, makes no network request of its own (the iframe load is the only one, always to
heyresearch.xyz), escapes every value it writes into a snippet, and accepts a resize message only
from its own frame.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md): `pnpm install`, then `pnpm scan`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm build`. Tests never touch the network. Never commit secrets.

## Licence

[MIT](LICENSE) © 2026 HEY Research Lab
