// Next.js: a Content-Security-Policy that lets the widget run. The npm package is bundled into
// your own scripts, so script-src needs no extra host; frames come only from heyresearch.xyz.
// Next.js itself may need more (for example 'unsafe-inline' or a nonce for its inline scripts):
// merge these two directives into the policy you already have.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  'frame-src https://heyresearch.xyz',
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: csp }] }];
  },
};

export default nextConfig;
