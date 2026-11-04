import bestiaryData from './bestiary.json';

export interface BestiaryEntry {
  name: string;
  creatureClass: string;
  difficulty: string;
  isVeryRare: boolean;
}

export interface BestiaryRule {
  stages: [number, number, number];
  charmPoints: number;
  veryRareCharmPoints: number;
}

export const VERY_RARE_STAGES: [number, number, number] = [2, 3, 5];

export const bestiaryRules: Record<string, BestiaryRule> = {
  Harmless: { stages: [5, 10, 25], charmPoints: 1, veryRareCharmPoints: 5 },
  Trivial: { stages: [10, 100, 250], charmPoints: 5, veryRareCharmPoints: 10 },
  Easy: { stages: [25, 250, 500], charmPoints: 15, veryRareCharmPoints: 30 },
  Medium: { stages: [50, 500, 1000], charmPoints: 25, veryRareCharmPoints: 50 },
  Hard: { stages: [100, 1000, 2500], charmPoints: 50, veryRareCharmPoints: 100 },
  Challenging: {
    stages: [200, 2000, 5000],
    charmPoints: 100,
    veryRareCharmPoints: 200,
  },
};

export const bestiaryDataDate = bestiaryData.fetchedAt;

export const bestiaryEntries: BestiaryEntry[] = bestiaryData.entries
  .map((row) => {
    const [name, creatureClass, difficulty, veryRare] = row as [
      string,
      string,
      string,
      number,
    ];

    return { name, creatureClass, difficulty, isVeryRare: veryRare === 1 };
  })
  .filter(({ difficulty }) => difficulty in bestiaryRules);

export const creatureClasses = [
  ...new Set(bestiaryEntries.map(({ creatureClass }) => creatureClass)),
].sort();
