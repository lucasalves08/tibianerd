import { describe, expect, it } from 'vitest';
import { lootRarity } from '../data/lootRarity';
import { getRareDrops, type LootRarity } from './rareDrops';

const loot: LootRarity = new Map<string, [string, number][]>([
  ['mega dragon', [['dragon slayer', 2], ['ultimate mana potion', 0]]],
  ['dragolisk', [['dragon shield', 2], ['ultimate mana potion', 1]]],
  ['wardragon', [['white gem', 1], ['dragonbone staff', 1]]],
]);

const items = [
  { name: 'platinum coin', count: 6177 },
  { name: 'ultimate mana potion', count: 52 },
  { name: 'white gem', count: 9 },
  { name: 'dragon slayer', count: 2 },
  { name: 'dragon shield', count: 1 },
];

describe('getRareDrops', () => {
  it('lists rare drops with the very rare first', () => {
    const monsters = [
      { name: 'Mega Dragon', count: 608 },
      { name: 'Dragolisk', count: 600 },
      { name: 'Wardragon', count: 549 },
    ];

    expect(getRareDrops({ monsters, items }, loot)).toEqual([
      { name: 'dragon slayer', count: 2, rarity: 'very-rare' },
      { name: 'dragon shield', count: 1, rarity: 'very-rare' },
      { name: 'white gem', count: 9, rarity: 'rare' },
    ]);
  });

  it('trusts the creature that drops an item more often', () => {
    const monsters = [{ name: 'Dragolisk', count: 600 }];

    expect(
      getRareDrops({ monsters, items }, loot).map(({ name }) => name),
    ).toContain('ultimate mana potion');

    monsters.push({ name: 'Mega Dragon', count: 608 });

    expect(
      getRareDrops({ monsters, items }, loot).map(({ name }) => name),
    ).not.toContain('ultimate mana potion');
  });

  it('ignores items of creatures it does not know', () => {
    const monsters = [{ name: 'Unknown Thing', count: 10 }];

    expect(getRareDrops({ monsters, items }, loot)).toEqual([]);
  });

  it('reads the data from TibiaWiki', () => {
    expect(lootRarity.get('mega dragon')).toContainEqual(['dragon slayer', 2]);
  });
});
