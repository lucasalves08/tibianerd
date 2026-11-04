import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tools } from './tools';
import { toolSprites } from './toolSprites';

describe('toolSprites', () => {
  it('only references existing tools', () => {
    const ids = tools.map((tool) => tool.id);

    expect(ids).toEqual(expect.arrayContaining(Object.keys(toolSprites)));
  });

  it.each(Object.values(toolSprites))(
    'has an animated and a still version of %s',
    (sprite) => {
      expect(existsSync(`public/sprites/${sprite}.gif`)).toBe(true);
      expect(existsSync(`public/sprites/${sprite}.png`)).toBe(true);
    },
  );
});
