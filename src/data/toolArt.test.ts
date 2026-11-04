import { describe, expect, it } from 'vitest';
import { ART_SIZE, toolArt } from './toolArt';
import { tools } from './tools';

describe('toolArt', () => {
  it('has a drawing for every tool', () => {
    expect(Object.keys(toolArt).sort()).toEqual(
      tools.map((tool) => tool.id).sort(),
    );
  });

  it.each(Object.entries(toolArt))('keeps %s on a square grid', (_, art) => {
    expect(art.rows).toHaveLength(ART_SIZE);

    for (const row of art.rows) {
      expect(row).toHaveLength(ART_SIZE);
    }
  });

  it.each(Object.entries(toolArt))('defines every color of %s', (_, art) => {
    const colors = new Set(art.rows.join('').replaceAll('.', ''));

    expect([...colors].sort()).toEqual(Object.keys(art.palette).sort());
  });
});
