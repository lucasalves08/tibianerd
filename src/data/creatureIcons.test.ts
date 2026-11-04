import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bestiaryEntries } from './bestiary';
import { getCreatureIcon } from './creatureIcons';
import { creatures } from './creatures';

describe('getCreatureIcon', () => {
  it('uses the sprite of the creature', () => {
    expect(getCreatureIcon('Dragon Lord')).toEqual({
      file: '/sprites/creatures/dragon-lord.webp',
      stillFile: '/sprites/creatures/dragon-lord-still.webp',
    });
  });

  it('falls back to the Bestiary class icon', () => {
    expect(getCreatureIcon('Dragon', new Set())?.file).toBe(
      '/icons/classes/dragon.webp',
    );
  });

  it('gives nothing for an unknown creature', () => {
    expect(getCreatureIcon('Not a creature')).toBeUndefined();
  });

  it('has both sprite files for every creature', () => {
    const names = [...creatures, ...bestiaryEntries].map(({ name }) => name);

    for (const name of names) {
      const icon = getCreatureIcon(name);

      expect(icon?.stillFile, name).toBeDefined();
      expect(existsSync(`public${icon?.file}`), name).toBe(true);
      expect(existsSync(`public${icon?.stillFile}`), name).toBe(true);
    }
  });
});
