// Listed on https://rubinot.com.br/worlds, reviewed on 2026-11-04.
export const rubinotWorlds = [
  'Auroria',
  'Belaria',
  'Bellum',
  'Drakaria',
  'Eldrian',
  'Elysian',
  'Infernum I',
  'Infernum II',
  'Infernum III',
  'Lunarian',
  'Malveria',
  'Mystian',
  'Obsidian',
  'Solarian',
  'Tenebrium',
  'Vesperia',
] as const;

export type RubinotWorld = (typeof rubinotWorlds)[number];

/** One world first, so the list of ads does not launch empty. */
export const LAUNCH_WORLD: RubinotWorld = 'Vesperia';
