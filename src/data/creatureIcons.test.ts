import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bestiaryEntries } from './bestiary';
import { getCreatureIcon } from './creatureIcons';

describe('getCreatureIcon', () => {
  it('prefers the animated sprite', () => {
    expect(getCreatureIcon('Dragon')).toEqual({
      file: '/sprites/creatures/dragon.gif',
      stillFile: '/sprites/creatures/dragon.png',
    });
  });

  it('falls back to the Bestiary class icon', () => {
    const entry = bestiaryEntries.find(({ name }) => name === 'Dragon Lord');

    expect(entry).toBeDefined();
    expect(getCreatureIcon('Dragon Lord')?.file).toMatch(/^\/icons\/classes\//);
  });

  it('gives nothing for an unknown creature', () => {
    expect(getCreatureIcon('Not a creature')).toBeUndefined();
  });

  it('has a file for every Bestiary entry', () => {
    for (const { name } of bestiaryEntries) {
      expect(existsSync(`public${getCreatureIcon(name)?.file}`)).toBe(true);
    }
  });
});
