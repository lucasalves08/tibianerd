import type { VocationId } from './characterStats';

export interface PartyMember {
  vocation: VocationId;
  level: number;
}

export interface LevelRange {
  lowest: number;
  highest: number;
}

export interface PartySummary {
  size: number;
  sharesExperience: boolean;
  /** Lowest level the current highest member can share with. */
  requiredLowest: number;
  joinRange: LevelRange | null;
  bonus: number;
  /** Share of the creature's experience that each member receives. */
  experiencePerMember: number;
}

export const PARTY_RULES_DATE = '2026-11-04';

// Index is the number of different vocations. TibiaWiki stops at 4.
const BONUS_BY_VOCATIONS = [0, 0.2, 0.35, 0.7, 1];
const MAX_LISTED_VOCATIONS = BONUS_BY_VOCATIONS.length - 1;

const lowestSharing = (level: number) => Math.ceil((level * 2) / 3);
const highestSharing = (level: number) => Math.floor((level * 3) / 2);

export const getSharedBonus = (vocations: VocationId[]): number =>
  BONUS_BY_VOCATIONS[Math.min(new Set(vocations).size, MAX_LISTED_VOCATIONS)]!;

export const hasUnlistedBonus = (vocations: VocationId[]): boolean =>
  new Set(vocations).size > MAX_LISTED_VOCATIONS;

export const summarizeParty = (members: PartyMember[]): PartySummary | null => {
  if (members.length === 0) {
    return null;
  }

  const levels = members.map(({ level }) => level);
  const lowestLevel = Math.min(...levels);
  const highestLevel = Math.max(...levels);
  const requiredLowest = lowestSharing(highestLevel);
  const sharesExperience = lowestLevel >= requiredLowest;
  const bonus = getSharedBonus(members.map(({ vocation }) => vocation));

  return {
    size: members.length,
    sharesExperience,
    requiredLowest,
    joinRange: sharesExperience
      ? { lowest: requiredLowest, highest: highestSharing(lowestLevel) }
      : null,
    bonus,
    experiencePerMember: (1 + bonus) / members.length,
  };
};
