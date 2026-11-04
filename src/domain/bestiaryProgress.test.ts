import { describe, expect, it } from 'vitest';
import { bestiaryEntries, type BestiaryEntry } from '../data/bestiary';
import { getEntryProgress, summarizeBestiary } from './bestiaryProgress';

const dragon: BestiaryEntry = {
  name: 'Dragon',
  creatureClass: 'Dragon',
  difficulty: 'Medium',
  isVeryRare: false,
};

const rareHard: BestiaryEntry = {
  name: 'Rare',
  creatureClass: 'Magical',
  difficulty: 'Hard',
  isVeryRare: true,
};

describe('bestiary data', () => {
  it('has the Dragon entry', () => {
    expect(bestiaryEntries.find(({ name }) => name === 'Dragon')).toEqual(dragon);
  });

  it('only keeps entries with a known difficulty', () => {
    expect(bestiaryEntries.length).toBeGreaterThan(500);
  });
});

describe('getEntryProgress', () => {
  it('finds the stage and the kills left', () => {
    expect(getEntryProgress(dragon, 600)).toMatchObject({
      stage: 2,
      killsLeft: 400,
      charmPoints: 25,
      isComplete: false,
    });
  });

  it('starts at stage 0', () => {
    expect(getEntryProgress(dragon, 0)).toMatchObject({ stage: 0, killsLeft: 1000 });
  });

  it('uses the short table for very rare creatures', () => {
    expect(getEntryProgress(rareHard, 5)).toMatchObject({
      stage: 3,
      killsLeft: 0,
      charmPoints: 100,
      isComplete: true,
    });
  });
});

describe('summarizeBestiary', () => {
  it('adds earned and available points', () => {
    expect(summarizeBestiary([dragon, rareHard], { Rare: 5 })).toEqual({
      completed: 1,
      total: 2,
      earnedPoints: 100,
      availablePoints: 125,
    });
  });
});
