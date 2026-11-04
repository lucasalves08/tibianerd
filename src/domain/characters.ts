import { rubinotWorlds, type RubinotWorld } from '../data/rubinotWorlds';
import { vocations, type VocationId } from './characterStats';

export interface CharacterInput {
  name: string;
  world: RubinotWorld;
  vocation: VocationId;
  level: number;
}

export interface Character extends CharacterInput {
  id: string;
}

/** Product limit against abuse, not a game rule. */
export const MAX_CHARACTERS = 20;

const NAME_PATTERN = /^\p{L}[\p{L}' -]{1,29}$/u;

export const isValidLevel = (level: unknown): level is number =>
  Number.isSafeInteger(level) && (level as number) > 0;

export const parseCharacter = (input: unknown): CharacterInput | null => {
  const { name, world, vocation, level } = (input ?? {}) as Record<
    string,
    unknown
  >;
  const cleanName =
    typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';

  if (
    !NAME_PATTERN.test(cleanName) ||
    !rubinotWorlds.some((item) => item === world) ||
    !vocations.some(({ id }) => id === vocation) ||
    !isValidLevel(level)
  ) {
    return null;
  }

  return {
    name: cleanName,
    world: world as RubinotWorld,
    vocation: vocation as VocationId,
    level,
  };
};
