import { bestiaryEntries } from './bestiary';
import creatureSprites from './creatureSprites.json';

export interface CreatureIconSource {
  file: string;
  stillFile?: string;
}

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const spriteNames = new Set(creatureSprites);

const classByName = new Map(
  bestiaryEntries.map(({ name, creatureClass }) => [name, creatureClass]),
);

// Sprites come from the Fankit and cover few creatures, so the Bestiary class
// icon from TibiaWiki stands in for the others.
export function getCreatureIcon(name: string): CreatureIconSource | undefined {
  if (spriteNames.has(name)) {
    const base = `/sprites/creatures/${toSlug(name)}`;

    return { file: `${base}.gif`, stillFile: `${base}.png` };
  }

  const creatureClass = classByName.get(name);

  return creatureClass
    ? { file: `/icons/classes/${toSlug(creatureClass)}.webp` }
    : undefined;
}
