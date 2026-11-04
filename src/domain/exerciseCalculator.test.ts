import { describe, expect, it } from 'vitest';
import { tibiaGlobal } from '../data/exerciseWeapons';
import {
  calculateTraining,
  getSuggestedMix,
  getWeaponOptions,
  type TrainingBonuses,
  type TrainingGoal,
} from './exerciseCalculator';

const noBonuses: TrainingBonuses = {
  privateDummy: false,
  doubleEvent: false,
  loyaltyPercent: 0,
};

const makeGoal = (
  pairId: string,
  currentLevel: number | null,
  targetLevel: number | null,
  percentLeft: number | null = 100,
): TrainingGoal => ({ pairId, currentLevel, targetLevel, percentLeft });

function getCharges(goal: TrainingGoal, bonuses = noBonuses): number {
  const charges = calculateTraining(goal, bonuses, tibiaGlobal).result?.charges;

  if (charges === undefined) {
    throw new Error('Expected a result');
  }

  return charges;
}

const knight = makeGoal('knight-melee', 110, 120);

describe('calculateTraining', () => {
  it.each([
    ['knight-melee', 110, 120, 1525600, 1519500],
    ['druid-magic', 110, 120, 1519400, 1519500],
    ['paladin-distance', 100, 110, 588300, 586000],
    ['monk-fist', 100, 110, 588300, 586000],
    ['knight-shielding', 100, 110, 588300, 586000],
    ['knight-magic', 10, 12, 630000, 630000],
    ['monk-magic', 50, 60, 6213000, 6213000],
  ])(
    'matches both references for %s %i to %i',
    (pairId, currentLevel, targetLevel, tibiaWatch, tibiaPal) => {
      const charges = getCharges(makeGoal(pairId, currentLevel, targetLevel));

      expect(Math.abs(charges / tibiaWatch - 1)).toBeLessThan(0.01);
      expect(Math.abs(charges / tibiaPal - 1)).toBeLessThan(0.01);
    },
  );

  it('counts only the remaining part of the current level', () => {
    const half = getCharges(makeGoal('knight-melee', 100, 101, 50));

    expect(half).toBe(Math.ceil(getCharges(makeGoal('knight-melee', 100, 101)) / 2));
  });

  it('rounds charges up and takes 2 seconds per charge', () => {
    const { result } = calculateTraining(knight, noBonuses, tibiaGlobal);

    expect(Number.isInteger(result?.charges)).toBe(true);
    expect(result?.seconds).toBe((result?.charges ?? 0) * 2);
  });

  it.each([
    ['the target is not above the current level', makeGoal('knight-melee', 120, 120), 'targetLevel'],
    ['the percent is out of range', makeGoal('knight-melee', 110, 120, 0), 'percentLeft'],
    ['the percent is above 100', makeGoal('knight-melee', 110, 120, 101), 'percentLeft'],
    ['a level is below the start', makeGoal('knight-melee', 5, 120), 'currentLevel'],
    ['the target is above the limit', makeGoal('knight-melee', 110, 500), 'targetLevel'],
    ['a level is not whole', makeGoal('knight-melee', 110.5, 120), 'currentLevel'],
  ])('reports a problem when %s', (_, goal, field) => {
    const { problems, result } = calculateTraining(goal, noBonuses, tibiaGlobal);

    expect(result).toBeUndefined();
    expect(problems.map((problem) => problem.field)).toContain(field);
  });

  it('gives no result and no problem while fields are empty', () => {
    const { problems, result } = calculateTraining(
      makeGoal('knight-melee', null, null),
      noBonuses,
      tibiaGlobal,
    );

    expect(result).toBeUndefined();
    expect(problems).toEqual([]);
  });

  it.each([
    ['private dummy', { privateDummy: true }, 1.1],
    ['double event', { doubleEvent: true }, 2],
    ['50% loyalty', { loyaltyPercent: 50 }, 1.5],
    ['all bonuses', { privateDummy: true, doubleEvent: true, loyaltyPercent: 50 }, 3.3],
  ])('divides the charges with %s', (_, bonuses, divisor) => {
    const charges = getCharges(knight, { ...noBonuses, ...bonuses });

    expect(charges).toBeCloseTo(getCharges(knight) / divisor, -1);
  });
});

describe('getWeaponOptions', () => {
  it('rounds each weapon up and sums its prices', () => {
    const [lasting, durable, exercise] = getWeaponOptions(2000, tibiaGlobal.weapons);

    expect(lasting).toMatchObject({ quantity: 1, gold: 12500000, coins: 720 });
    expect(durable).toMatchObject({ quantity: 2, gold: 3125000, coins: 180 });
    expect(exercise).toMatchObject({ quantity: 4, gold: 1736112, coins: 100 });
  });
});

describe('getSuggestedMix', () => {
  const quantities = (charges: number) =>
    getSuggestedMix(charges, tibiaGlobal.weapons).items.map(
      ({ weapon, quantity }) => [weapon.id, quantity],
    );

  it('uses the largest weapons that fit and covers the rest', () => {
    expect(quantities(2000)).toEqual([
      ['durable', 1],
      ['exercise', 1],
    ]);
  });

  it('skips weapons with no quantity', () => {
    expect(quantities(14400)).toEqual([['lasting', 1]]);
  });

  it.each([
    ['knight-melee', 110, 120, 105, 7, 2],
    ['druid-magic', 110, 120, 105, 3, 4],
    ['paladin-distance', 100, 110, 40, 6, 3],
    ['monk-fist', 100, 110, 40, 6, 3],
  ])('matches TibiaWatch for %s %i to %i', (pairId, from, to, lasting, durable, exercise) => {
    expect(quantities(getCharges(makeGoal(pairId, from, to)))).toEqual([
      ['lasting', lasting],
      ['durable', durable],
      ['exercise', exercise],
    ]);
  });

  it('sums the mix prices', () => {
    expect(getSuggestedMix(2000, tibiaGlobal.weapons)).toMatchObject({
      gold: 1996528,
      coins: 115,
    });
  });
});
