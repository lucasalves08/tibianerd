import {
  bestiaryRules,
  VERY_RARE_STAGES,
  type BestiaryEntry,
} from '../data/bestiary';

export type KillCounts = Record<string, number>;

export interface EntryProgress {
  stage: number;
  stageKills: [number, number, number];
  killsLeft: number;
  charmPoints: number;
  isComplete: boolean;
}

export interface BestiarySummary {
  completed: number;
  total: number;
  earnedPoints: number;
  availablePoints: number;
}

export function getEntryProgress(
  entry: BestiaryEntry,
  kills: number,
): EntryProgress {
  const rule = bestiaryRules[entry.difficulty]!;
  const stageKills = entry.isVeryRare ? VERY_RARE_STAGES : rule.stages;
  const finalKills = stageKills[2];

  return {
    stage: stageKills.filter((required) => kills >= required).length,
    stageKills,
    killsLeft: Math.max(finalKills - kills, 0),
    charmPoints: entry.isVeryRare ? rule.veryRareCharmPoints : rule.charmPoints,
    isComplete: kills >= finalKills,
  };
}

export function summarizeBestiary(
  entries: BestiaryEntry[],
  killCounts: KillCounts,
): BestiarySummary {
  const summary = {
    completed: 0,
    total: entries.length,
    earnedPoints: 0,
    availablePoints: 0,
  };

  for (const entry of entries) {
    const { charmPoints, isComplete } = getEntryProgress(
      entry,
      killCounts[entry.name] ?? 0,
    );

    summary.availablePoints += charmPoints;

    if (isComplete) {
      summary.completed += 1;
      summary.earnedPoints += charmPoints;
    }
  }

  return summary;
}
