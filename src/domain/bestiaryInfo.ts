import {
  bestiaryRules,
  VERY_RARE_STAGES,
  type BestiaryEntry,
} from '../data/bestiary';

export interface BestiaryInfo {
  stageKills: [number, number, number];
  charmPoints: number;
}

export function getBestiaryInfo(entry: BestiaryEntry): BestiaryInfo {
  const rule = bestiaryRules[entry.difficulty]!;

  return entry.isVeryRare
    ? { stageKills: VERY_RARE_STAGES, charmPoints: rule.veryRareCharmPoints }
    : { stageKills: rule.stages, charmPoints: rule.charmPoints };
}
