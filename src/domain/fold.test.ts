import { describe, expect, it } from 'vitest';
import { fold } from './fold';

describe('fold', () => {
  it('removes accents and case', () => {
    expect(fold('Resistências')).toBe('resistencias');
  });
});
