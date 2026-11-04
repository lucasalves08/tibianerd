import { describe, expect, it } from 'vitest';
import { bestiaryEntries, type BestiaryEntry } from '../data/bestiary';
import { getBestiaryInfo } from './bestiaryInfo';

const dragon: BestiaryEntry = {
  name: 'Dragon',
  creatureClass: 'Dragon',
  difficulty: 'Medium',
  isVeryRare: false,
};

describe('bestiary data', () => {
  it('has the Dragon entry', () => {
    expect(bestiaryEntries.find(({ name }) => name === 'Dragon')).toEqual(dragon);
  });

  it('only keeps entries with a known difficulty', () => {
    expect(bestiaryEntries.length).toBeGreaterThan(500);
  });
});

describe('getBestiaryInfo', () => {
  it('uses the difficulty table', () => {
    expect(getBestiaryInfo(dragon)).toEqual({
      stageKills: [50, 500, 1000],
      charmPoints: 25,
    });
  });

  it('uses the short table for very rare creatures', () => {
    expect(
      getBestiaryInfo({ ...dragon, difficulty: 'Hard', isVeryRare: true }),
    ).toEqual({ stageKills: [2, 3, 5], charmPoints: 100 });
  });
});
