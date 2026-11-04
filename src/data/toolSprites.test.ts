import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tools } from './tools';
import { toolSprites } from './toolSprites';

describe('toolSprites', () => {
  it('only references existing tools', () => {
    const ids = tools.map((tool) => tool.id);

    expect(ids).toEqual(expect.arrayContaining(Object.keys(toolSprites)));
  });

  it.each(Object.values(toolSprites))('has the files of $file', (sprite) => {
    const files = [sprite.file, sprite.stillFile ?? sprite.file];

    for (const file of files) {
      expect(existsSync(`public/sprites/${file}`)).toBe(true);
    }
  });
});
