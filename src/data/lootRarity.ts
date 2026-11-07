import type { LootRarity } from '../domain/rareDrops';
import lootData from './lootRarity.json';

export const source = lootData.source;

export const lootRarity: LootRarity = new Map(
  Object.entries(lootData.creatures).map(([name, loot]) => [
    name.toLowerCase(),
    loot as [string, number][],
  ]),
);
