import { describe, expect, it } from 'vitest';
import { isValidLevel, parseCharacter } from './characters';

const valid = {
  name: 'Lucas Santos',
  world: 'Vesperia',
  vocation: 'paladin',
  level: 967,
};

describe('parseCharacter', () => {
  it('accepts a complete character', () => {
    expect(parseCharacter(valid)).toEqual(valid);
  });

  it('cleans the spaces of the name', () => {
    expect(parseCharacter({ ...valid, name: '  Lucas   Santos ' })?.name).toBe(
      'Lucas Santos',
    );
  });

  it('keeps accents, apostrophes and hyphens', () => {
    expect(parseCharacter({ ...valid, name: "Ká'el-Dan" })?.name).toBe(
      "Ká'el-Dan",
    );
  });

  it.each([
    ['a short name', { ...valid, name: 'L' }],
    ['a name with symbols', { ...valid, name: 'Lucas<b>' }],
    ['an unknown world', { ...valid, world: 'Antica' }],
    ['an unknown vocation', { ...valid, vocation: 'elite knight' }],
    ['a level of zero', { ...valid, level: 0 }],
    ['a level as text', { ...valid, level: '967' }],
    ['nothing', null],
  ])('rejects %s', (_, input) => {
    expect(parseCharacter(input)).toBeNull();
  });
});

describe('isValidLevel', () => {
  it('accepts only positive whole numbers', () => {
    expect(isValidLevel(1)).toBe(true);
    expect(isValidLevel(1.5)).toBe(false);
    expect(isValidLevel(-1)).toBe(false);
  });
});
