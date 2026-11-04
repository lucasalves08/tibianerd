import huntData from './hunts.json';

export const huntVocations = [
  { id: 'knight', name: 'Knight', levelIndex: 0 },
  { id: 'monk', name: 'Monk', levelIndex: 0 },
  { id: 'paladin', name: 'Paladin', levelIndex: 1 },
  { id: 'sorcerer', name: 'Sorcerer', levelIndex: 2 },
  { id: 'druid', name: 'Druid', levelIndex: 2 },
] as const;

export type HuntVocationId = (typeof huntVocations)[number]['id'];

export interface Hunt {
  name: string;
  city: string;
  levels: (number | null)[];
  experienceRating: number | null;
  lootRating: number | null;
  creatureNames: string[];
  /** Estimated spawns, in the same order as creatureNames. */
  creatureSpawns: number[];
}

type HuntRow = [
  string,
  string,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  string[],
  number[],
];

export const huntDataDate = huntData.fetchedAt;

export const hunts: Hunt[] = (huntData.hunts as HuntRow[]).map(
  ([
    name,
    city,
    knight,
    paladin,
    mage,
    experience,
    loot,
    creatureNames,
    creatureSpawns,
  ]) => ({
    name,
    city,
    levels: [knight, paladin, mage],
    experienceRating: experience,
    lootRating: loot,
    creatureNames,
    creatureSpawns,
  }),
);

export const huntCities = [
  ...new Set(hunts.map(({ city }) => city).filter(Boolean)),
].sort();
