import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HeyProject } from '../src/react';

/** The React wrapper renders on a server (no window) and hands the hosted script the same attributes. */
describe('@hey-research-lab/embed/react', () => {
  it('renders <hey-project> with a fallback link, server-side', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToStaticMarkup(
      createElement(HeyProject, {
        slug: 'hoodlock',
        variant: 'compact',
        theme: 'dark',
        height: 120,
      }),
    );
    expect(html).toBe(
      '<hey-project project="hoodlock" variant="compact" theme="dark" height="120">' +
        '<a href="https://heyresearch.xyz/project/hoodlock">hoodlock on HEY Research Lab</a></hey-project>',
    );
  });

  it('passes a contract, a label, a class and custom fallback content', () => {
    const html = renderToStaticMarkup(
      createElement(
        HeyProject,
        {
          contract: '0x1234567890abcdef1234567890abcdef12345678',
          label: 'Token builder evidence',
          className: 'w',
        },
        createElement('span', null, 'Builder evidence on HEY'),
      ),
    );
    expect(html).toBe(
      '<hey-project contract="0x1234567890abcdef1234567890abcdef12345678" label="Token builder evidence" class="w">' +
        '<span>Builder evidence on HEY</span></hey-project>',
    );
  });

  it('links the fallback to heyresearch.xyz when the slug is not valid, and escapes text', () => {
    const html = renderToStaticMarkup(createElement(HeyProject, { project: '"><img src=x>' }));
    expect(html).toContain(
      '<a href="https://heyresearch.xyz">Project intelligence from HEY Research Lab</a>',
    );
    expect(html).not.toContain('<img');
  });
});
