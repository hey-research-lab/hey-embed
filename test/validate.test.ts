import { describe, expect, it } from 'vitest';

import { parseEmbedHeight, validateEmbedAttributes } from '../src/validate';

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const codes = (r: { errors: { code: string }[]; warnings: { code: string }[] }) => ({
  errors: r.errors.map((e) => e.code),
  warnings: r.warnings.map((w) => w.code),
});

describe('validateEmbedAttributes', () => {
  it('accepts a slug with defaults', () => {
    const r = validateEmbedAttributes({ project: 'hoodlock' });
    expect(r).toMatchObject({
      ok: true,
      ref: { kind: 'slug', slug: 'hoodlock' },
      segment: 'hoodlock',
      variant: 'builder',
      theme: 'auto',
      initialHeight: 196,
      title: 'Project intelligence from HEY Research Lab',
    });
    expect(codes(r)).toEqual({ errors: [], warnings: [] });
  });

  it('accepts a Robinhood Chain contract in either spelling', () => {
    expect(validateEmbedAttributes({ contract: ADDRESS }).segment).toBe(ADDRESS);
    expect(validateEmbedAttributes({ contract: `4663:${ADDRESS}` }).segment).toBe(
      `4663:${ADDRESS}`,
    );
  });

  it('reports another chain as unsupported_chain and falls back to the slug, as the element does', () => {
    const r = validateEmbedAttributes({ contract: `1:${ADDRESS}`, project: 'hoodlock' });
    expect(r.ok).toBe(false);
    expect(r.segment).toBe('hoodlock');
    expect(codes(r).errors).toEqual(['unsupported_chain']);
  });

  it('reports every refused attribute', () => {
    const r = validateEmbedAttributes({
      project: 'Hood Lock',
      variant: 'mega',
      theme: 'neon',
      height: '10',
    });
    expect(r.ok).toBe(false);
    expect(r.ref).toBeUndefined();
    expect(codes(r).errors).toEqual([
      'invalid_slug',
      'invalid_variant',
      'invalid_theme',
      'invalid_height',
    ]);
    expect(r.variant).toBe('builder');
    expect(r.theme).toBe('auto');
  });

  it('asks for a project when none is named', () => {
    expect(codes(validateEmbedAttributes({})).errors).toEqual(['missing_ref']);
    expect(codes(validateEmbedAttributes({ project: '  ' })).errors).toEqual(['missing_ref']);
  });

  it('warns about attributes that change nothing', () => {
    expect(
      codes(validateEmbedAttributes({ contract: ADDRESS, project: 'hoodlock' })).warnings,
    ).toEqual(['project_ignored']);
    expect(codes(validateEmbedAttributes({ project: ADDRESS })).warnings).toEqual([
      'contract_in_project',
    ]);
    const long = validateEmbedAttributes({ project: 'x', label: 'y'.repeat(130) });
    expect(long.title).toHaveLength(120);
    expect(codes(long).warnings).toEqual(['label_truncated']);
  });

  it('reads a height as whole pixels in range', () => {
    expect(parseEmbedHeight('60')).toBe(60);
    expect(parseEmbedHeight(' 1200 ')).toBe(1200);
    expect(parseEmbedHeight(300)).toBe(300);
    for (const bad of [
      '59',
      '1201',
      '12.5',
      '-100',
      '1e3',
      '0x100',
      '',
      'auto',
      null,
      undefined,
      300.5,
    ]) {
      expect(parseEmbedHeight(bad), String(bad)).toBeUndefined();
    }
  });
});
