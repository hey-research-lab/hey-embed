# Content Security Policy for pages that embed a HEY widget

Two directives matter: where the element's code comes from (`script-src`) and where the frame
comes from (`frame-src`). Frames always come from `https://heyresearch.xyz`.

| How you load `<hey-project>`                                                               | `script-src` needs                                                          | `frame-src` needs         |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------- |
| Production's hosted script `https://heyresearch.xyz/embed/hey-project.js`                  | `https://heyresearch.xyz`                                                   | `https://heyresearch.xyz` |
| This package, bundled into your own scripts (`import '@hey-research-lab/embed'`)           | nothing beyond your own (`'self'`)                                          | `https://heyresearch.xyz` |
| This package from a CDN, pinned (`…/@hey-research-lab/embed@0.1.0/dist/hey-embed.iife.js`) | the CDN host, e.g. `https://cdn.jsdelivr.net` — with `integrity` on the tag | `https://heyresearch.xyz` |
| This package, self-hosted copy of `dist/hey-embed.iife.js`                                 | `'self'`                                                                    | `https://heyresearch.xyz` |
| A plain `<iframe>` (no script)                                                             | nothing                                                                     | `https://heyresearch.xyz` |

Minimal header for the hosted script:

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://heyresearch.xyz; frame-src https://heyresearch.xyz; object-src 'none'; base-uri 'none'
```

Minimal header when the package is bundled:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; frame-src https://heyresearch.xyz; object-src 'none'; base-uri 'none'
```

If your policy has no `frame-src`, browsers fall back to `child-src`, then `default-src`; either
must then allow `https://heyresearch.xyz`.

Not needed:

- **`connect-src`** — the element makes no request; only the frame loads.
- **`img-src`, `font-src`** — nothing is loaded into your page.
- **`style-src`** — the element sizes its frame through the CSSOM (`element.style`), which
  `style-src` does not govern; it writes no `<style>` element and no `style` attribute markup.
- **`'unsafe-eval'`, `'unsafe-inline'`** — the element uses neither `eval`, `new Function` nor
  inline handlers.

**Trusted Types.** Under `require-trusted-types-for 'script'` the element works unchanged: it never
assigns HTML (`innerHTML`, `srcdoc`, `document.write`) and only sets an iframe's `src`, which is not
a Trusted Types sink.

**Subresource integrity.** Production's hosted script is the current contract and may change
(it is served with `cache-control: public, max-age=3600`), so it cannot carry an `integrity` hash.
To pin, load a versioned copy of this package and add the hash of the exact file:

```sh
curl -s https://cdn.jsdelivr.net/npm/@hey-research-lab/embed@0.1.0/dist/hey-embed.iife.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

```js
import { scriptTag } from '@hey-research-lab/embed';
scriptTag({
  scriptSrc: 'https://cdn.jsdelivr.net/npm/@hey-research-lab/embed@0.1.0/dist/hey-embed.iife.js',
  integrity: 'sha384-<hash>',
});
```

**Referrer.** The frame request carries the `Referer` your page's referrer policy allows (by default
`strict-origin-when-cross-origin`: your origin only). heyresearch.xyz uses the host's domain to
label the widget's link back and to count a bare impression; set `Referrer-Policy: no-referrer` (or
a `<meta name="referrer" content="no-referrer">`) to send none. The widget still renders.

**Your own `frame-ancestors`** governs who may frame _your_ page and does not affect the widget.
