import { describe, expect, it } from 'vitest';
import {
  cleanCharacterName,
  isGameServer,
  parseRubinot,
  parseTibiaData,
} from './characters';

describe('cleanCharacterName', () => {
  it('cleans the spaces of the name', () => {
    expect(cleanCharacterName('  Lucas   Santos ')).toBe('Lucas Santos');
  });

  it('keeps accents, apostrophes and hyphens', () => {
    expect(cleanCharacterName("Ká'el-Dan")).toBe("Ká'el-Dan");
  });

  it.each([['L'], ['Lucas<b>'], [42], [null]])('rejects %s', (name) => {
    expect(cleanCharacterName(name)).toBeNull();
  });
});

describe('isGameServer', () => {
  it('accepts only the known servers', () => {
    expect(isGameServer('rubinot')).toBe(true);
    expect(isGameServer('antica')).toBe(false);
  });
});

describe('parseTibiaData', () => {
  it('reads a character from TibiaData', () => {
    expect(
      parseTibiaData({
        character: {
          character: {
            name: 'Bubble',
            vocation: 'Elite Knight',
            level: 273,
            world: 'Refugia',
            guild: { name: 'Red Rose' },
          },
        },
      }),
    ).toEqual({
      server: 'tibia',
      name: 'Bubble',
      world: 'Refugia',
      vocation: 'knight',
      level: 273,
      guild: 'Red Rose',
    });
  });

  it('finds nothing in an empty answer', () => {
    expect(parseTibiaData({ character: { character: { name: '' } } })).toBeNull();
    expect(parseTibiaData({})).toBeNull();
  });
});

describe('parseRubinot', () => {
  const player = {
    name: 'Bubble',
    level: 8,
    vocation: 'Royal Paladin',
    world: 'Bellum',
    guild: null,
  };

  it('reads a character from RubinOT', () => {
    expect(parseRubinot({ player })).toEqual({
      server: 'rubinot',
      name: 'Bubble',
      world: 'Bellum',
      vocation: 'paladin',
      level: 8,
      guild: null,
    });
  });

  it('reads the guild in both shapes', () => {
    expect(parseRubinot({ player: { ...player, guild: 'Rubini' } })?.guild).toBe(
      'Rubini',
    );
    expect(
      parseRubinot({ player: { ...player, guild: { name: 'Rubini' } } })?.guild,
    ).toBe('Rubini');
  });

  it('rejects a character without a vocation', () => {
    expect(parseRubinot({ player: { ...player, vocation: 'None' } })).toBeNull();
  });

  it('finds nothing without a player', () => {
    expect(parseRubinot({ player: null })).toBeNull();
    expect(parseRubinot({})).toBeNull();
  });
});
