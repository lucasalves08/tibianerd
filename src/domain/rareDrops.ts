import type { HuntEntry } from './parseHuntLog';

/** 0 is a more common drop, 1 is rare and 2 is very rare. */
export type LootRarity = Map<string, [item: string, rarity: number][]>;

export type DropRarity = 'rare' | 'very-rare';

export interface RareDrop {
  name: string;
  count: number;
  rarity: DropRarity;
}

const MORE_COMMON = 0;
const VERY_RARE = 2;

// An item is rare only if no creature of the session drops it more often.
export const getRareDrops = (
  { monsters, items }: { monsters: HuntEntry[]; items: HuntEntry[] },
  loot: LootRarity,
): RareDrop[] => {
  const rarities = new Map<string, number>();

  for (const { name } of monsters) {
    for (const [item, rarity] of loot.get(name.toLowerCase()) ?? []) {
      rarities.set(item, Math.min(rarities.get(item) ?? rarity, rarity));
    }
  }

  const drops = items.flatMap(({ name, count }): RareDrop[] => {
    const rarity = rarities.get(name.toLowerCase()) ?? MORE_COMMON;

    return rarity === MORE_COMMON
      ? []
      : [{ name, count, rarity: rarity === VERY_RARE ? 'very-rare' : 'rare' }];
  });

  return drops.sort(
    (a, b) => Number(b.rarity === 'very-rare') - Number(a.rarity === 'very-rare'),
  );
};
