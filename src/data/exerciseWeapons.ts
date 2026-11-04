export interface ExerciseWeapon {
  id: string;
  name: string;
  charges: number;
  goldPrice: number;
  coinPrice: number;
}

export interface TrainingPair {
  id: string;
  vocation: string;
  skill: string;
  pointsConstant: number;
  vocationConstant: number;
  offset: number;
  pointsPerCharge: number;
}

export interface ServerData {
  name: string;
  reviewedAt: string;
  sources: { name: string; url: string }[];
  weapons: ExerciseWeapon[];
  pairs: TrainingPair[];
}

const magic = { skill: 'Magic level', pointsConstant: 1600, offset: 0, pointsPerCharge: 600 };
const melee = { skill: 'Melee', pointsConstant: 50, offset: 10, pointsPerCharge: 7.2 };
const fist = { skill: 'Fist', pointsConstant: 50, offset: 10, pointsPerCharge: 7.2 };
const distance = { skill: 'Distance', pointsConstant: 30, offset: 10, pointsPerCharge: 4.32 };
const shielding = { skill: 'Shielding', pointsConstant: 100, offset: 10, pointsPerCharge: 14.4 };

// Values reviewed by hand. See specs/001-exercise-calculator/research.md.
export const tibiaGlobal: ServerData = {
  name: 'Tibia Global',
  reviewedAt: '2026-11-04',
  sources: [
    { name: 'TibiaWiki', url: 'https://tibia.fandom.com/wiki/Exercise_Weapons' },
    {
      name: 'TibiaDaily',
      url: 'https://tibiadaily.com/exercise-weapons-are-getting-more-expensive-again/',
    },
  ],
  weapons: [
    { id: 'lasting', name: 'Lasting', charges: 14400, goldPrice: 12500000, coinPrice: 720 },
    { id: 'durable', name: 'Durable', charges: 1800, goldPrice: 1562500, coinPrice: 90 },
    { id: 'exercise', name: 'Exercise', charges: 500, goldPrice: 434028, coinPrice: 25 },
  ],
  pairs: [
    { id: 'knight-melee', vocation: 'Knight', vocationConstant: 1.1, ...melee },
    { id: 'knight-shielding', vocation: 'Knight', vocationConstant: 1.1, ...shielding },
    { id: 'knight-magic', vocation: 'Knight', vocationConstant: 3, ...magic },
    { id: 'paladin-distance', vocation: 'Paladin', vocationConstant: 1.1, ...distance },
    { id: 'paladin-magic', vocation: 'Paladin', vocationConstant: 1.4, ...magic },
    { id: 'sorcerer-magic', vocation: 'Sorcerer', vocationConstant: 1.1, ...magic },
    { id: 'druid-magic', vocation: 'Druid', vocationConstant: 1.1, ...magic },
    { id: 'monk-fist', vocation: 'Monk', vocationConstant: 1.1, ...fist },
    { id: 'monk-magic', vocation: 'Monk', vocationConstant: 1.25, ...magic },
  ],
};
