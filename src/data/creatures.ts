import creatureData from './creatures.json';

export const elements = [
  'physical',
  'earth',
  'fire',
  'energy',
  'ice',
  'death',
  'holy',
] as const;

export type Element = (typeof elements)[number];

export interface Creature {
  name: string;
  hitPoints: number;
  modifiers: Record<Element, number>;
}

export const dataDate = creatureData.fetchedAt;

export const creatures: Creature[] = creatureData.creatures.map((row) => {
  const [name, hitPoints, ...modifiers] = row as [string, number, ...number[]];

  return {
    name,
    hitPoints,
    modifiers: Object.fromEntries(
      elements.map((element, index) => [element, modifiers[index]]),
    ) as Record<Element, number>,
  };
});
