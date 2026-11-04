import { tierChances, type Charm, type Tier } from '../data/charms';
import type { Creature } from '../data/creatures';

const ELEMENTAL_DAMAGE = 0.05;
const LEVEL_CAP_MULTIPLIER = 2;
const OVERPOWER_DAMAGE = 0.05;
const OVERFLUX_DAMAGE = 0.025;
const NEUTRAL_CAP = 0.08;
const TIE_TOLERANCE = 1e-9;

export interface Character {
  level: number;
  hitPoints: number;
  mana: number;
}

export interface HuntCreature {
  creature: Creature;
  kills: number;
}

export interface OwnedCharm {
  charm: Charm;
  tier: Tier;
}

export interface Assignment extends OwnedCharm {
  creature: Creature;
  damagePerProc: number;
  isLevelCapped: boolean;
}

export interface OptimizedCharms {
  assignments: Assignment[];
  unused: OwnedCharm[];
}

function isCapped(creature: Creature, level: number): boolean {
  return (
    level > 0 &&
    creature.hitPoints * ELEMENTAL_DAMAGE > level * LEVEL_CAP_MULTIPLIER
  );
}

// Overpower and Overflux scale with the character, before the creature's cap.
function getNeutralDamage(charmId: string, character: Character): number {
  return charmId === 'overpower'
    ? character.hitPoints * OVERPOWER_DAMAGE
    : character.mana * OVERFLUX_DAMAGE;
}

export function getDamagePerProc(
  charm: Charm,
  creature: Creature,
  character: Character,
): number {
  const { level } = character;

  if (charm.element) {
    const base = creature.hitPoints * ELEMENTAL_DAMAGE;
    const capped = isCapped(creature, level)
      ? level * LEVEL_CAP_MULTIPLIER
      : base;

    return (capped * creature.modifiers[charm.element]) / 100;
  }

  return Math.min(
    getNeutralDamage(charm.id, character),
    creature.hitPoints * NEUTRAL_CAP,
  );
}

// A creature with more hit points takes more hits to kill, so it gets more
// chances to proc. That is why hit points weigh in on top of the damage.
function getScore(
  { creature, kills }: HuntCreature,
  { charm, tier }: OwnedCharm,
  character: Character,
): number {
  const chance = tierChances[tier - 1];

  return (
    getDamagePerProc(charm, creature, character) *
    chance *
    creature.hitPoints *
    kills
  );
}

export function getBestElementalCharms(
  charms: Charm[],
  creature: Creature,
): Charm[] {
  const elemental = charms.filter((charm) => charm.element);
  const best = Math.max(
    ...elemental.map((charm) => creature.modifiers[charm.element!]),
  );

  return best > 0
    ? elemental.filter((charm) => creature.modifiers[charm.element!] === best)
    : [];
}

function countBits(value: number): number {
  return value.toString(2).replaceAll('0', '').length;
}

// Each charm goes to one creature and each creature takes one charm. There are
// few charms, so trying every subset of them per creature is exact and fast.
// On a tie, earlier creatures in the list take the earlier charms.
export function optimizeCharms(
  hunt: HuntCreature[],
  owned: OwnedCharm[],
  character: Character,
  slots: number,
): OptimizedCharms {
  const maskCount = 1 << owned.length;
  const scores = hunt.map((huntCreature) =>
    owned.map((ownedCharm) => getScore(huntCreature, ownedCharm, character)),
  );
  const canUse = (mask: number, charmIndex: number, score: number) =>
    score > 0 &&
    !(mask & (1 << charmIndex)) &&
    countBits(mask) < slots;

  // best[index][mask]: the top score for creatures from index on, with mask used.
  const best = Array.from(
    { length: hunt.length + 1 },
    () => new Float64Array(maskCount),
  );

  for (let index = hunt.length - 1; index >= 0; index -= 1) {
    for (let mask = 0; mask < maskCount; mask += 1) {
      let top = best[index + 1]![mask]!;

      scores[index]!.forEach((score, charmIndex) => {
        if (canUse(mask, charmIndex, score)) {
          top = Math.max(
            top,
            score + best[index + 1]![mask | (1 << charmIndex)]!,
          );
        }
      });

      best[index]![mask] = top;
    }
  }

  const assignments: Assignment[] = [];
  let mask = 0;

  hunt.forEach(({ creature }, index) => {
    const target = best[index]![mask]!;
    const charmIndex = scores[index]!.findIndex((score, candidate) => {
      if (!canUse(mask, candidate, score)) {
        return false;
      }

      const total = score + best[index + 1]![mask | (1 << candidate)]!;

      return Math.abs(total - target) <= target * TIE_TOLERANCE;
    });

    if (charmIndex < 0) {
      return;
    }

    const ownedCharm = owned[charmIndex]!;
    const damagePerProc = getDamagePerProc(
      ownedCharm.charm,
      creature,
      character,
    );

    assignments.push({
      ...ownedCharm,
      creature,
      damagePerProc,
      isLevelCapped:
        Boolean(ownedCharm.charm.element) &&
        isCapped(creature, character.level),
    });
    mask |= 1 << charmIndex;
  });

  return {
    assignments,
    unused: owned.filter((_, index) => !(mask & (1 << index))),
  };
}
