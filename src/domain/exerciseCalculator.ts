import type {
  ExerciseWeapon,
  ServerData,
  TrainingPair,
} from '../data/exerciseWeapons';

const SECONDS_PER_CHARGE = 2;
const MAX_LEVEL = 200;
const MIN_PERCENT = 0.01;
const MAX_PERCENT = 100;
const PRIVATE_DUMMY_BONUS = 1.1;
const DOUBLE_EVENT_BONUS = 2;

export interface TrainingGoal {
  pairId: string;
  currentLevel: number | null;
  percentLeft: number | null;
  targetLevel: number | null;
}

export interface TrainingBonuses {
  privateDummy: boolean;
  doubleEvent: boolean;
  loyaltyPercent: number;
}

export interface TrainingProblem {
  field: 'currentLevel' | 'percentLeft' | 'targetLevel';
  message: string;
}

export interface WeaponOption {
  weapon: ExerciseWeapon;
  quantity: number;
  gold: number;
  coins: number;
}

export interface WeaponMix {
  items: WeaponOption[];
  gold: number;
  coins: number;
}

export interface TrainingResult {
  charges: number;
  seconds: number;
  options: WeaponOption[];
  mix: WeaponMix;
}

export interface TrainingCalculation {
  problems: TrainingProblem[];
  result?: TrainingResult;
}

function getPointsForLevel(pair: TrainingPair, level: number): number {
  return (
    pair.pointsConstant * pair.vocationConstant ** (level - pair.offset)
  );
}

function getPointsNeeded(
  pair: TrainingPair,
  currentLevel: number,
  percentLeft: number,
  targetLevel: number,
): number {
  let points = getPointsForLevel(pair, currentLevel) * (percentLeft / 100);

  for (let level = currentLevel + 1; level < targetLevel; level += 1) {
    points += getPointsForLevel(pair, level);
  }

  return points;
}

function getPointsPerCharge(
  pair: TrainingPair,
  { privateDummy, doubleEvent, loyaltyPercent }: TrainingBonuses,
): number {
  return (
    pair.pointsPerCharge *
    (privateDummy ? PRIVATE_DUMMY_BONUS : 1) *
    (doubleEvent ? DOUBLE_EVENT_BONUS : 1) *
    (1 + loyaltyPercent / 100)
  );
}

function makeOption(weapon: ExerciseWeapon, quantity: number): WeaponOption {
  return {
    weapon,
    quantity,
    gold: weapon.goldPrice * quantity,
    coins: weapon.coinPrice * quantity,
  };
}

export function getWeaponOptions(
  charges: number,
  weapons: ExerciseWeapon[],
): WeaponOption[] {
  return weapons.map((weapon) =>
    makeOption(weapon, Math.ceil(charges / weapon.charges)),
  );
}

// Takes as many of each size as fit, then covers what is left with the smallest.
export function getSuggestedMix(
  charges: number,
  weapons: ExerciseWeapon[],
): WeaponMix {
  const sorted = [...weapons].sort((a, b) => b.charges - a.charges);
  let remaining = charges;

  const items = sorted
    .map((weapon, index) => {
      const isSmallest = index === sorted.length - 1;
      const quantity = isSmallest
        ? Math.ceil(remaining / weapon.charges)
        : Math.floor(remaining / weapon.charges);

      remaining -= quantity * weapon.charges;

      return makeOption(weapon, quantity);
    })
    .filter(({ quantity }) => quantity > 0);

  return {
    items,
    gold: items.reduce((sum, { gold }) => sum + gold, 0),
    coins: items.reduce((sum, { coins }) => sum + coins, 0),
  };
}

function validate(
  { currentLevel, percentLeft, targetLevel }: TrainingGoal,
  pair: TrainingPair,
): TrainingProblem[] {
  const problems: TrainingProblem[] = [];

  if (
    currentLevel !== null &&
    (!Number.isInteger(currentLevel) || currentLevel < pair.offset)
  ) {
    problems.push({
      field: 'currentLevel',
      message: `Use um número inteiro a partir de ${pair.offset}.`,
    });
  }

  if (
    percentLeft !== null &&
    (percentLeft < MIN_PERCENT || percentLeft > MAX_PERCENT)
  ) {
    problems.push({
      field: 'percentLeft',
      message: `Use um valor de ${MIN_PERCENT.toLocaleString('pt-BR')} a ${MAX_PERCENT}.`,
    });
  }

  if (targetLevel !== null) {
    if (!Number.isInteger(targetLevel) || targetLevel > MAX_LEVEL) {
      problems.push({
        field: 'targetLevel',
        message: `Use um número inteiro de até ${MAX_LEVEL}.`,
      });
    } else if (currentLevel !== null && targetLevel <= currentLevel) {
      problems.push({
        field: 'targetLevel',
        message: 'A skill desejada precisa ser maior que a atual.',
      });
    }
  }

  return problems;
}

export function calculateTraining(
  goal: TrainingGoal,
  bonuses: TrainingBonuses,
  server: ServerData,
): TrainingCalculation {
  const pair = server.pairs.find(({ id }) => id === goal.pairId);

  if (!pair) {
    return { problems: [] };
  }

  const problems = validate(goal, pair);
  const { currentLevel, percentLeft, targetLevel } = goal;

  if (
    problems.length > 0 ||
    currentLevel === null ||
    percentLeft === null ||
    targetLevel === null
  ) {
    return { problems };
  }

  const charges = Math.ceil(
    getPointsNeeded(pair, currentLevel, percentLeft, targetLevel) /
      getPointsPerCharge(pair, bonuses),
  );

  return {
    problems,
    result: {
      charges,
      seconds: charges * SECONDS_PER_CHARGE,
      options: getWeaponOptions(charges, server.weapons),
      mix: getSuggestedMix(charges, server.weapons),
    },
  };
}
