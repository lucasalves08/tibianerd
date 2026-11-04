export const vocations = [
  { id: 'knight', name: 'Knight' },
  { id: 'monk', name: 'Monk' },
  { id: 'paladin', name: 'Paladin' },
  { id: 'sorcerer', name: 'Sorcerer' },
  { id: 'druid', name: 'Druid' },
] as const;

export type VocationId = (typeof vocations)[number]['id'];

export interface BaseStats {
  hitPoints: number;
  mana: number;
}

const FIRST_VOCATION_LEVEL = 8;

const rookieStats = (level: number): BaseStats => ({
  hitPoints: 5 * (level + 29),
  mana: 5 * (level + 10),
});

const statsByVocation: Record<VocationId, (level: number) => BaseStats> = {
  knight: (level) => ({ hitPoints: 5 * (3 * level + 13), mana: 5 * (level + 10) }),
  monk: (level) => ({ hitPoints: 5 * (2 * level + 21), mana: 5 * (2 * level + 2) }),
  paladin: (level) => ({ hitPoints: 5 * (2 * level + 21), mana: 5 * (3 * level - 6) }),
  sorcerer: (level) => ({ hitPoints: 5 * (level + 29), mana: 5 * (6 * level - 30) }),
  druid: (level) => ({ hitPoints: 5 * (level + 29), mana: 5 * (6 * level - 30) }),
};

/** Life and mana from level alone, before equipment and other bonuses. */
export const getBaseStats = (
  vocation: VocationId | '',
  level: number,
): BaseStats | null => {
  if (!vocation || level < 1) {
    return null;
  }

  return level < FIRST_VOCATION_LEVEL
    ? rookieStats(level)
    : statsByVocation[vocation](level);
};
