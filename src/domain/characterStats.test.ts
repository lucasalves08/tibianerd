import { describe, expect, it } from 'vitest';
import { getBaseStats, vocations } from './characterStats';

describe('getBaseStats', () => {
  it('uses the same stats for every vocation at level 8', () => {
    for (const { id } of vocations) {
      expect(getBaseStats(id, 8)).toEqual({ hitPoints: 185, mana: 90 });
    }
  });

  it('applies the gains of each vocation', () => {
    expect(getBaseStats('knight', 100)).toEqual({ hitPoints: 1565, mana: 550 });
    expect(getBaseStats('monk', 100)).toEqual({ hitPoints: 1105, mana: 1010 });
    expect(getBaseStats('paladin', 967)).toEqual({
      hitPoints: 9775,
      mana: 14475,
    });
    expect(getBaseStats('sorcerer', 100)).toEqual({ hitPoints: 645, mana: 2850 });
    expect(getBaseStats('druid', 100)).toEqual({ hitPoints: 645, mana: 2850 });
  });

  it('uses the rookie gains before level 8', () => {
    expect(getBaseStats('knight', 7)).toEqual({ hitPoints: 180, mana: 85 });
  });

  it('needs a vocation and a level', () => {
    expect(getBaseStats('', 100)).toBeNull();
    expect(getBaseStats('paladin', 0)).toBeNull();
  });
});
