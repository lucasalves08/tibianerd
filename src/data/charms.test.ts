import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { charms, getCharmIconPath } from './charms';

describe('charms', () => {
  it.each(charms.map(({ id }) => id))('has an icon for %s', (id) => {
    expect(existsSync(`public${getCharmIconPath(id)}`)).toBe(true);
  });
});
