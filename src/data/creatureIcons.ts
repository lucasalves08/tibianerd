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

// Sprites come from TibiaWiki. A creature added by a data update can arrive
// before its sprite, so the Bestiary class icon covers that gap.
export function getCreatureIcon(
  name: string,
  sprites: Set<string> = spriteNames,
): CreatureIconSource | undefined {
  if (sprites.has(name)) {
    const base = `/sprites/creatures/${toSlug(name)}`;

    return { file: `${base}.webp`, stillFile: `${base}-still.webp` };
  }

  const creatureClass = classByName.get(name);

  return creatureClass
    ? { file: `/icons/classes/${toSlug(creatureClass)}.webp` }
    : undefined;
}
