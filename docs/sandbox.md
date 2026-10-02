# Sandboxing a HEY widget

Every widget frame — drawn by `<hey-project>`, the React wrapper or a plain `<iframe>` — uses the
sandbox production's own element and snippets use:

```html
sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
```

| Token                            | Why the widget needs it                                                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allow-scripts`                  | The widget document runs one script of its own, `/embed/frame.js`, which posts the document's height to the parent and nothing else. Without it the widget still renders, at its first height, with no resizing. |
| `allow-popups`                   | The widget's links open the project's page on heyresearch.xyz in a new tab (`target="_blank" rel="noopener noreferrer"`).                                                                                        |
| `allow-popups-to-escape-sandbox` | That new tab is an ordinary page, not one stuck in the frame's sandbox.                                                                                                                                          |

Do **not** add:

- `allow-same-origin` — the frame would then run with heyresearch.xyz's real origin (its cookies
  and storage) instead of an opaque one. The widget needs neither, and the element's resize check
  does not depend on the origin.
- `allow-top-navigation` / `allow-top-navigation-by-user-activation` — the widget never navigates
  your page.
- `allow-forms`, `allow-modals`, `allow-downloads`, `allow-pointer-lock`, `allow-presentation` —
  unused.

No `allow` (Permissions Policy) attribute is needed: the widget asks for no camera, microphone,
geolocation, payment or clipboard access.

## The resize message

The frame posts `{ type: 'hey-embed:height', height: <number> }` to its parent with target `*`
(a sandboxed frame has an opaque origin, so there is no origin to name, and a height reveals
nothing). The element accepts a message only when `event.source` is its own frame's
`contentWindow`, only with that `type` and a finite numeric `height`, and clamps it to 60–1200px.
Another frame or script on your page cannot resize it, and a forged message can at most change a
height within that range. The element posts nothing back.

## The widget document

`/embed/project/{ref}` returns a small server-rendered HTML document (not a framework page) with
its own policy: `default-src 'none'; script-src 'self'; style-src '<hash of its one stylesheet>';
img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors *`. It
sets no cookie, loads no image, font or third-party resource, and is the only heyresearch.xyz route
family that may be framed by any site. It is `noindex`, cached privately for 60 seconds, and
rate-limited per client address.

## Pages that allow no scripts

Use the plain iframe from `iframeSnippet()` (fixed height, no resizing):

```html
<iframe
  src="https://heyresearch.xyz/embed/project/hoodlock?variant=full&amp;theme=light"
  title="HoodLock on HEY Research Lab"
  width="100%"
  height="340"
  loading="lazy"
  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
  style="border:0;display:block;max-width:100%"
></iframe>
```
