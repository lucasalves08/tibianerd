import { describe, expect, it } from 'vitest';
import { charms, type Tier } from '../data/charms';
import type { Creature, Element } from '../data/creatures';
import {
  getBestElementalCharms,
  getDamagePerProc,
  getNeutralDamage,
  optimizeCharms,
  type Character,
  type OwnedCharm,
} from './charmOptimizer';

function makeCreature(
  name: string,
  hitPoints: number,
  modifiers: Partial<Record<Element, number>>,
): Creature {
  return {
    name,
    hitPoints,
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

const getCharm = (id: string) => charms.find((charm) => charm.id === id)!;
const own = (ids: string[], tier: Tier = 3): OwnedCharm[] =>
  ids.map((id) => ({ charm: getCharm(id), tier }));
const character: Character = { level: 1000, hitPoints: 8500, mana: 3200 };

describe('getDamagePerProc', () => {
  it('deals 5% of the creature hit points times its resistance', () => {
    const dragon = makeCreature('dragon', 1000, { ice: 110, fire: 0 });

    expect(getDamagePerProc(getCharm('freeze'), dragon, character)).toBeCloseTo(55);
    expect(getDamagePerProc(getCharm('enflame'), dragon, character)).toBe(0);
  });

  it('caps elemental damage at twice the level before resistances', () => {
    const creature = makeCreature('big', 100000, { fire: 120 });

    expect(
      getDamagePerProc(getCharm('enflame'), creature, {
        ...character,
        level: 500,
      }),
    ).toBeCloseTo(1200);
  });

  it('ignores resistances and caps neutral charms at 8% of the creature', () => {
    const creature = makeCreature('tiny', 1000, { physical: 0 });

    expect(getDamagePerProc(getCharm('overpower'), creature, character)).toBe(80);
    expect(
      getDamagePerProc(
        getCharm('overflux'),
        makeCreature('big', 100000, {}),
        character,
      ),
    ).toBeCloseTo(80);
  });
});

describe('getNeutralDamage', () => {
  it('uses 5% of life for Overpower and 2.5% of mana for Overflux', () => {
    const player = { level: 967, hitPoints: 9653, mana: 14970 };

    expect(getNeutralDamage('overpower', player)).toBeCloseTo(482.65);
    expect(getNeutralDamage('overflux', player)).toBeCloseTo(374.25);
  });
});

describe('getBestElementalCharms', () => {
  const best = (creature: Creature) =>
    getBestElementalCharms(charms, creature).map(({ id }) => id);

  it('picks the highest modifier', () => {
    expect(best(makeCreature('dragon', 1000, { ice: 110 }))).toEqual(['freeze']);
  });

  it('keeps every charm that ties', () => {
    expect(best(makeCreature('tie', 1000, { fire: 120, ice: 120 }))).toEqual([
      'enflame',
      'freeze',
    ]);
  });

  it('returns nothing when every element is immune', () => {
    const immune = makeCreature('immune', 1000, {
      physical: 0,
      earth: 0,
      fire: 0,
      energy: 0,
      ice: 0,
      death: 0,
      holy: 0,
    });

    expect(best(immune)).toEqual([]);
  });
});

describe('optimizeCharms', () => {
  // Same spawn and kills as the example published by TibiaMaps.
  const darklightCore = [
    {
      creature: makeCreature('darklight striker', 29700, {
        fire: 125,
        earth: 115,
        physical: 90,
        death: 100,
      }),
      kills: 251,
    },
    {
      creature: makeCreature('darklight matter', 30150, {
        fire: 125,
        physical: 110,
        earth: 110,
        death: 100,
      }),
      kills: 251,
    },
    {
      creature: makeCreature('walking pillar', 38000, {
        fire: 115,
        earth: 115,
        physical: 110,
        death: 90,
      }),
      kills: 160,
    },
    {
      creature: makeCreature('darklight source', 31550, {
        fire: 115,
        physical: 110,
        earth: 110,
        death: 100,
      }),
      kills: 156,
    },
  ];

  it('matches the TibiaMaps Darklight Core result', () => {
    const { assignments } = optimizeCharms(
      darklightCore,
      own(['wound', 'enflame', 'poison', 'curse']),
      character,
      4,
    );

    expect(
      assignments.map(({ creature, charm }) => [creature.name, charm.id]),
    ).toEqual([
      ['darklight striker', 'poison'],
      ['darklight matter', 'enflame'],
      ['walking pillar', 'wound'],
      ['darklight source', 'curse'],
    ]);
  });

  describe('on a tie', () => {
    const inferniarchs = [
      {
        creature: makeCreature('Brinebrute', 32000, {
          physical: 80,
          earth: 110,
          energy: 85,
          ice: 90,
          death: 110,
        }),
        kills: 1,
      },
      {
        creature: makeCreature('Hellhunter', 11300, {
          physical: 90,
          earth: 115,
          fire: 105,
          energy: 85,
          ice: 95,
          death: 115,
        }),
        kills: 1,
      },
      {
        creature: makeCreature('Spellreaper', 11800, {
          physical: 90,
          earth: 115,
          fire: 105,
          energy: 0,
          ice: 90,
          death: 115,
        }),
        kills: 1,
      },
    ];
    const picks = (hunt: typeof inferniarchs) =>
      optimizeCharms(
        hunt,
        own(charms.map(({ id }) => id).slice(0, 7), 2),
        character,
        6,
      ).assignments.map(({ creature, charm }) => [creature.name, charm.id]);

    it('gives the earlier charm to the earlier creature', () => {
      expect(picks(inferniarchs)).toEqual([
        ['Brinebrute', 'poison'],
        ['Hellhunter', 'enflame'],
        ['Spellreaper', 'curse'],
      ]);
    });

    it('follows the order of the list', () => {
      expect(picks([...inferniarchs].reverse())).toEqual([
        ['Spellreaper', 'poison'],
        ['Hellhunter', 'enflame'],
        ['Brinebrute', 'curse'],
      ]);
    });
  });

  it('uses each charm once and each creature once', () => {
    const { assignments, unused } = optimizeCharms(
      [
        { creature: makeCreature('a', 1000, { ice: 120 }), kills: 1 },
        { creature: makeCreature('b', 2000, { ice: 120 }), kills: 1 },
      ],
      own(['freeze', 'wound', 'zap']),
      character,
      6,
    );

    expect(assignments.map(({ charm }) => charm.id)).toEqual(['wound', 'freeze']);
    expect(unused.map(({ charm }) => charm.id)).toEqual(['zap']);
  });

  it('respects the charm slots by keeping the most valuable creatures', () => {
    const { assignments } = optimizeCharms(
      [
        { creature: makeCreature('small', 1000, {}), kills: 1 },
        { creature: makeCreature('big', 5000, {}), kills: 1 },
      ],
      own(['wound', 'freeze']),
      character,
      1,
    );

    expect(assignments.map(({ creature }) => creature.name)).toEqual(['big']);
  });

  it('skips charms the creature is immune to', () => {
    const { assignments } = optimizeCharms(
      [{ creature: makeCreature('immune', 1000, { fire: 0 }), kills: 1 }],
      own(['enflame']),
      character,
      6,
    );

    expect(assignments).toEqual([]);
  });

  it('marks charms limited by the level', () => {
    const { assignments } = optimizeCharms(
      [{ creature: makeCreature('big', 100000, {}), kills: 1 }],
      own(['wound']),
      { ...character, level: 500 },
      6,
    );

    expect(assignments[0]?.isLevelCapped).toBe(true);
    expect(assignments[0]?.damagePerProc).toBeCloseTo(1000);
  });
});
