import { describe, expect, it } from 'vitest';
import {
  cleanCharacterName,
  createVerificationCode,
  getCharacterSprite,
  isGameServer,
  parseRubinot,
  parseTibiaData,
  readComment,
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

describe('getCharacterSprite', () => {
  it('uses the outfit of the character', () => {
    expect(
      getCharacterSprite({ outfit: 'type=136', vocation: 'knight', sex: 'male' }),
    ).toContain('type=136');
  });

  it('falls back to the vocation', () => {
    expect(
      getCharacterSprite({ outfit: null, vocation: 'knight', sex: 'female' }),
    ).toBe('/sprites/vocations/knight-female.png');
  });
});

describe('createVerificationCode', () => {
  it('builds a readable code', () => {
    expect(createVerificationCode(new Uint8Array([171, 12, 255]))).toBe(
      'TN-AB0CFF',
    );
  });
});

describe('readComment', () => {
  it('reads the comment of each server', () => {
    expect(
      readComment('tibia', { character: { character: { comment: 'TN-1' } } }),
    ).toBe('TN-1');
    expect(readComment('rubinot', { player: { comment: 'TN-2' } })).toBe('TN-2');
  });

  it('finds nothing without a comment', () => {
    expect(readComment('rubinot', {})).toBeNull();
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
      sex: 'male',
      outfit: null,
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
      sex: 'male',
      outfit: null,
    });
  });

  it('reads the sex', () => {
    expect(parseRubinot({ player: { ...player, sex: 'Female' } })?.sex).toBe(
      'female',
    );
  });

  it('reads the outfit', () => {
    expect(
      parseRubinot({
        player: {
          ...player,
          looktype: 136,
          lookhead: 1,
          lookbody: 2,
          looklegs: 3,
          lookfeet: 4,
          lookaddons: 3,
        },
      })?.outfit,
    ).toBe('type=136&head=1&body=2&legs=3&feet=4&addons=3');
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
