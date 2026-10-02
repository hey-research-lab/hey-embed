# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## 0.1.0 — 2026-10-02

Initial release.

### Added

- `<hey-project>` Web Component: one sandboxed iframe pointing at
  `https://heyresearch.xyz/embed/project/{ref}`, resized only by its own frame's
  `hey-embed:height` message (clamped to 60–1200px). Attributes `project`, `contract`, `variant`,
  `theme`, `label`, plus `slug` (alias of `project`) and `height` (first height drawn).
- Robinhood Chain only: contract refs `0x…` or `4663:0x…`; other chains refused with
  `unsupported_chain`; zero and dead addresses refused.
- `embedFrameUrl`, `projectPageUrl`, `readEmbedRef` / `parseEmbedRef` / `toEmbedRef`,
  `validateEmbedAttributes` with typed error and warning codes.
- Snippet builders `htmlSnippet`, `iframeSnippet`, `reactSnippet`, `scriptTag` (with SRI).
- Contract constants: variants, themes, defaults, variant labels, initial heights, height range,
  resize message type, sandbox, script and frame paths.
- React wrapper at `@hey-research-lab/embed/react` (optional `react` peer, marked `'use client'`).
- ESM and CommonJS builds with type declarations, and a `<script>` bundle
  `dist/hey-embed.iife.js` (`window.HeyEmbed`).
- Parity tests against fixtures recorded from production's embed contract, an opt-in live check
  (`pnpm test:live`) and a fixture refresh script (`pnpm parity:refresh`).
- Examples (plain HTML, React, Next.js), sandbox and Content Security Policy guides.
