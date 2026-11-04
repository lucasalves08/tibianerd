import { fold } from '../domain/fold';
import huntData from './hunts.json';
import tibiaRouteData from './tibiaRouteHunts.json';

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
  /** Page with details: TibiaWiki by default. */
  pageUrl: string;
  /** Guide on Tibia Route, when the place has one. */
  guideUrl: string | null;
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

type TibiaRouteRow = [string, string, (number | null)[], string[]];

const WIKI_URL = 'https://tibia.fandom.com/wiki/';

export const huntDataDate = huntData.fetchedAt;
export const tibiaRouteDate = tibiaRouteData.fetchedAt;

const placeKey = (name: string) => fold(name).replace(/[^a-z0-9]/g, '');

const wikiHunts: Hunt[] = (huntData.hunts as HuntRow[]).map(
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
    pageUrl: `${WIKI_URL}${encodeURIComponent(name.replaceAll(' ', '_'))}`,
    guideUrl: null,
  }),
);

const routeRows = new Map(
  (tibiaRouteData.hunts as TibiaRouteRow[]).map((row) => [placeKey(row[0]), row]),
);
const wikiKeys = new Set(wikiHunts.map(({ name }) => placeKey(name)));

// TibiaWiki stays the base. Tibia Route fills its gaps and adds other places.
export const hunts: Hunt[] = [
  ...wikiHunts.map((hunt) => {
    const row = routeRows.get(placeKey(hunt.name));

    return row
      ? {
          ...hunt,
          levels: hunt.levels.map((level, index) => level ?? row[2][index] ?? null),
          guideUrl: row[1],
        }
      : hunt;
  }),
  ...[...routeRows]
    .filter(([key]) => !wikiKeys.has(key))
    .map(([, [name, url, levels, creatureNames]]) => ({
      name,
      city: '',
      levels,
      experienceRating: null,
      lootRating: null,
      creatureNames,
      creatureSpawns: [],
      pageUrl: url,
      guideUrl: url,
    })),
];

export const huntCities = [
  ...new Set(hunts.map(({ city }) => city).filter(Boolean)),
].sort();
