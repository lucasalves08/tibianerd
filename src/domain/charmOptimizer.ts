import { tierChances, type Charm, type Tier } from '../data/charms';
import type { Creature } from '../data/creatures';

const ELEMENTAL_DAMAGE = 0.05;
const LEVEL_CAP_MULTIPLIER = 2;
const OVERPOWER_DAMAGE = 0.05;
const OVERFLUX_DAMAGE = 0.025;
const NEUTRAL_CAP = 0.08;

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
  damagePerHit: number;
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

export function getDamagePerProc(
  charm: Charm,
  creature: Creature,
  character: Character,
): number {
  const { level, hitPoints, mana } = character;

  if (charm.element) {
    const base = creature.hitPoints * ELEMENTAL_DAMAGE;
    const capped = isCapped(creature, level)
      ? level * LEVEL_CAP_MULTIPLIER
      : base;

    return (capped * creature.modifiers[charm.element]) / 100;
  }

  const damage =
    charm.id === 'overpower'
      ? hitPoints * OVERPOWER_DAMAGE
      : mana * OVERFLUX_DAMAGE;

  return Math.min(damage, creature.hitPoints * NEUTRAL_CAP);
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

// Weighs by hit points as well as kills, since tougher creatures take more hits.
export function getExpectedDamagePerHit(
  hunt: HuntCreature[],
  assignments: Assignment[],
): number {
  let totalWeight = 0;
  let totalDamage = 0;

  for (const { creature, kills } of hunt) {
    const assignment = assignments.find(
      (item) => item.creature.name === creature.name,
    );
    const weight = creature.hitPoints * kills;

    totalWeight += weight;
    totalDamage += (assignment?.damagePerHit ?? 0) * weight;
  }

  return totalWeight > 0 ? totalDamage / totalWeight : 0;
}

function countBits(value: number): number {
  return value.toString(2).replaceAll('0', '').length;
}

// Each charm goes to one creature and each creature takes one charm. There are
// few charms, so trying every subset of them per creature is exact and fast.
export function optimizeCharms(
  hunt: HuntCreature[],
  owned: OwnedCharm[],
  character: Character,
  slots: number,
): OptimizedCharms {
  const maskCount = 1 << owned.length;
  let best = new Float64Array(maskCount).fill(-1);
  best[0] = 0;

  const choices = hunt.map((huntCreature) => {
    const next = best.slice();
    const choice = new Int8Array(maskCount).fill(-1);

    owned.forEach((ownedCharm, charmIndex) => {
      const bit = 1 << charmIndex;
      const score = getScore(huntCreature, ownedCharm, character);

      if (score <= 0) {
        return;
      }

      for (let mask = 0; mask < maskCount; mask += 1) {
        if (best[mask]! < 0 || mask & bit) {
          continue;
        }

        const total = best[mask]! + score;

        if (total > next[mask | bit]!) {
          next[mask | bit] = total;
          choice[mask | bit] = charmIndex;
        }
      }
    });

    best = next;

    return choice;
  });

  let mask = 0;

  for (let candidate = 0; candidate < maskCount; candidate += 1) {
    if (countBits(candidate) <= slots && best[candidate]! > best[mask]!) {
      mask = candidate;
    }
  }

  const assignments: Assignment[] = [];
  const usedMask = mask;

  for (let index = hunt.length - 1; index >= 0; index -= 1) {
    const charmIndex = choices[index]![mask]!;

    if (charmIndex < 0) {
      continue;
    }

    const { creature } = hunt[index]!;
    const ownedCharm = owned[charmIndex]!;
    const damagePerProc = getDamagePerProc(
      ownedCharm.charm,
      creature,
      character,
    );

    assignments.unshift({
      ...ownedCharm,
      creature,
      damagePerProc,
      damagePerHit: damagePerProc * tierChances[ownedCharm.tier - 1],
      isLevelCapped:
        Boolean(ownedCharm.charm.element) &&
        isCapped(creature, character.level),
    });
    mask ^= 1 << charmIndex;
  }

  return {
    assignments,
    unused: owned.filter((_, index) => !(usedMask & (1 << index))),
  };
}
