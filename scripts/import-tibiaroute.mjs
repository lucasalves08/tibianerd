// Generates src/data/tibiaRouteHunts.json from a file extracted by the maintainer.
// Keeps only the name, guide link, levels and creatures of each place.
// Deleting the output file's hunts removes this source from the site.
// Run with: node scripts/import-tibiaroute.mjs <path to tibia_hunts.json>

import { readFile, writeFile } from 'node:fs/promises';

const OUTPUT_PATH = 'src/data/tibiaRouteHunts.json';
const LEVEL_INDEX_BY_VOCATION = { EK: 0, MK: 0, RP: 1, MS: 2, ED: 2 };

const lowest = (first, second) =>
  first === null ? second : second === null ? first : Math.min(first, second);

const { meta, hunts } = JSON.parse(await readFile(process.argv[2], 'utf8'));
const places = new Map();

for (const { nome, url, nivelMinimo, vocacoes, criaturas } of hunts) {
  const place = places.get(nome) ?? {
    url,
    levels: [null, null, null],
    creatureNames: new Set(),
  };

  for (const vocation of vocacoes) {
    const index = LEVEL_INDEX_BY_VOCATION[vocation];

    place.levels[index] = lowest(place.levels[index], nivelMinimo);
  }

  criaturas.forEach((name) => place.creatureNames.add(name));
  places.set(nome, place);
}

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({
    source: meta.fonte,
    fetchedAt: meta.extraidoEm,
    hunts: [...places].map(([name, { url, levels, creatureNames }]) => [
      name,
      url,
      levels,
      [...creatureNames],
    ]),
  })}\n`,
);

console.log(`${places.size} places saved`);
