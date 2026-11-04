import { describe, expect, it } from 'vitest';
import { fold, foldForSearch } from './fold';

describe('fold', () => {
  it('removes accents and case', () => {
    expect(fold('Resistências')).toBe('resistencias');
  });
});

describe('foldForSearch', () => {
  it('forgives doubled letters', () => {
    expect(foldForSearch('Azzilon Castle')).toBe(foldForSearch('azilon castle'));
  });
});
