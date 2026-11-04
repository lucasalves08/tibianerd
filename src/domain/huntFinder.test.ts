import { describe, expect, it } from 'vitest';
import type { Creature, Element } from '../data/creatures';
import { hunts as realHunts, type Hunt } from '../data/hunts';
import {
  findHunts,
  getBestElements,
  getMinimumLevel,
  type HuntFilters,
} from './huntFinder';

function makeCreature(
  name: string,
  modifiers: Partial<Record<Element, number>>,
): Creature {
  return {
    name,
    hitPoints: 100,
    modifiers: {
      physical: 100,
      earth: 100,
      fire: 100,
      energy: 100,
      ice: 100,
      death: 100,
      holy: 100,
      ...modifiers,
    },
  };
}

const makeHunt = (name: string, levels: (number | null)[], city = 'Thais'): Hunt => ({
  name,
  city,
  levels,
  creatureSpawns: [],
  experienceRating: 3,
  lootRating: 3,
  creatureNames: ['Ice Beast', 'Fire Beast'],
});

const creatures = new Map([
  ['ice beast', makeCreature('Ice Beast', { fire: 150 })],
  ['fire beast', makeCreature('Fire Beast', { fire: 120, ice: 110 })],
]);

const filters: HuntFilters = {
  vocation: 'paladin',
  level: null,
  city: '',
  element: '',
  query: '',
};

const names = (list: Hunt[]) => list.map(({ name }) => name);

describe('hunt data', () => {
  it('has hunts with levels and creatures', () => {
    expect(realHunts.length).toBeGreaterThan(300);
    expect(realHunts.find(({ name }) => name === 'Alchemist Quarter')).toMatchObject({
      city: 'Yalahar',
      levels: [40, 35, 35],
    });
  });
});

describe('getMinimumLevel', () => {
  it('shares levels between vocations', () => {
    const hunt = makeHunt('Spot', [10, 20, 30]);

    expect(getMinimumLevel(hunt, 'monk')).toBe(10);
    expect(getMinimumLevel(hunt, 'paladin')).toBe(20);
    expect(getMinimumLevel(hunt, 'druid')).toBe(30);
  });
});

describe('getBestElements', () => {
  it('averages the known creatures', () => {
    expect(getBestElements(makeHunt('Spot', [1, 1, 1]), creatures)).toEqual(['fire']);
  });

  it('returns nothing when no creature is known', () => {
    expect(getBestElements(makeHunt('Spot', [1, 1, 1]), new Map())).toEqual([]);
  });
});

describe('findHunts', () => {
  const list = [
    makeHunt('Low', [10, 10, 10]),
    makeHunt('High', [500, 500, 500], 'Venore'),
    makeHunt('Mages only', [null, null, 100]),
  ];

  it('sorts by the highest minimum level and drops other vocations', () => {
    expect(names(findHunts(list, filters, creatures))).toEqual(['High', 'Low']);
  });

  it('hides spots above the player level', () => {
    expect(names(findHunts(list, { ...filters, level: 100 }, creatures))).toEqual([
      'Low',
    ]);
  });

  it('filters by city, name and element', () => {
    expect(names(findHunts(list, { ...filters, city: 'Venore' }, creatures))).toEqual([
      'High',
    ]);
    expect(names(findHunts(list, { ...filters, query: 'lów' }, creatures))).toEqual([
      'Low',
    ]);
    expect(findHunts(list, { ...filters, element: 'ice' }, creatures)).toEqual([]);
  });
});
