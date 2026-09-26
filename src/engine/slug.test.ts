import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slugify('Add Dark Mode')).toBe('add-dark-mode');
  });

  it('strips accents and punctuation', () => {
    expect(slugify('Paginação: filtros & exportação!')).toBe('paginacao-filtros-exportacao');
  });

  it('collapses separators and trims dashes', () => {
    expect(slugify('  --fix   the  bug--  ')).toBe('fix-the-bug');
  });

  it('caps length without leaving a trailing dash', () => {
    const slug = slugify('a very long order title that keeps going and going forever and ever');
    expect(slug.length).toBeLessThanOrEqual(32);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('falls back to "task" when nothing usable is left', () => {
    expect(slugify('!!! ???')).toBe('task');
  });
});
