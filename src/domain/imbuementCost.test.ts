import { describe, expect, it } from 'vitest';
import { imbuements } from '../data/imbuements';
import {
  compareWithTokens,
  getImbuementCost,
  hasTokenOption,
} from './imbuementCost';

const find = (name: string) => imbuements.find((item) => item.name === name)!;
const POWERFUL = 2;

describe('imbuement data', () => {
  it('has 24 imbuements with 3 tiers', () => {
    expect(imbuements).toHaveLength(24);

    for (const imbuement of imbuements) {
      expect(imbuement.tiers).toHaveLength(3);
      expect(imbuement.availableFor).not.toMatch(/<ref|\{\{|\[\[/);
    }
  });

  it('adds one source per tier', () => {
    for (const { tiers } of imbuements) {
      expect(tiers.map(({ sources }) => sources.length)).toEqual([1, 2, 3]);
    }
  });

  it('reads the Powerful Scorch items', () => {
    expect(find('Scorch').tiers[POWERFUL]?.sources).toEqual([
      { item: 'Fiery Heart', amount: 25 },
      { item: 'Green Dragon Scale', amount: 5 },
      { item: 'Demon Horn', amount: 5 },
    ]);
  });

  it('keeps both effect columns of Strike', () => {
    expect(find('Strike').tiers[POWERFUL]?.effect).toBe('5% / 40%');
  });
});

describe('getImbuementCost', () => {
  const prices = {
    'Fiery Heart': 1000,
    'Green Dragon Scale': 2000,
    'Demon Horn': 3000,
  };

  it('adds the items and the shrine fee', () => {
    expect(getImbuementCost(find('Scorch'), POWERFUL, prices)).toEqual({
      missingItems: [],
      itemsCost: 50000,
      shrineFee: 250000,
      total: 300000,
      perHour: 15000,
    });
  });

  it('lists missing prices and gives no total', () => {
    const cost = getImbuementCost(find('Scorch'), POWERFUL, {
      'Fiery Heart': 1000,
    });

    expect(cost.missingItems).toEqual(['Green Dragon Scale', 'Demon Horn']);
    expect(cost.total).toBeUndefined();
  });
});

describe('compareWithTokens', () => {
  it('offers tokens only for Strike, Vampirism and Void', () => {
    expect(imbuements.filter(hasTokenOption).map(({ name }) => name)).toEqual([
      'Strike',
      'Vampirism',
      'Void',
    ]);
  });

  it('costs 2, 4 or 6 tokens per tier', () => {
    expect(
      [0, 1, 2].map((tier) => compareWithTokens(find('Void'), tier, 40000)?.tokens),
    ).toEqual([2, 4, 6]);
  });

  it('shows the savings against the market', () => {
    expect(compareWithTokens(find('Void'), POWERFUL, 40000, 500000)).toEqual({
      tokens: 6,
      tokensCost: 240000,
      total: 490000,
      savings: 10000,
    });
  });

  it('gives nothing without a token price or for other imbuements', () => {
    expect(compareWithTokens(find('Void'), POWERFUL, 0)).toBeUndefined();
    expect(compareWithTokens(find('Scorch'), POWERFUL, 40000)).toBeUndefined();
  });
});
