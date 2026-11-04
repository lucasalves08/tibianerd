// Generates src/data/imbuements.json from TibiaWiki (CC-BY-SA).
// Run with: node scripts/fetch-imbuements.mjs

import { writeFile } from 'node:fs/promises';

const API_URL = 'https://tibia.fandom.com/api.php?action=parse&format=json&prop=wikitext&page=Imbuing';
const OUTPUT_PATH = 'src/data/imbuements.json';
const TIERS = ['Basic', 'Intricate', 'Powerful'];

const response = await fetch(API_URL, {
  headers: { 'User-Agent': 'TibiaNerd data script (fan site)' },
});

if (!response.ok) {
  throw new Error(`TibiaWiki answered ${response.status}`);
}

const wikitext = (await response.json()).parse.wikitext['*'];
const stripMarkup = (text) =>
  text
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>.*?<\/ref>/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replaceAll("'''", '')
    .replace(/\s+/g, ' ')
    .trim();

function parseSources(text) {
  return [...text.matchAll(/(\d+)\s+\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map(
    ([, amount, item]) => ({ item, amount: Number(amount) }),
  );
}

const rows = [
  ...wikitext.matchAll(
    /^\|\s*\[\[(Basic|Intricate|Powerful) ([^\]]+)\]\]\s*\n((?:\|(?!-|\}).*\n)+)/gm,
  ),
];
const imbuements = new Map();

for (const [, tier, name, block] of rows) {
  const cells = block
    .trim()
    .split('\n')
    .map((cell) => cell.replace(/^\|\s*/, ''));
  // Some tables have an extra effect column, so the sources mark the position.
  const sourcesIndex = cells.findIndex((cell) => /^\d+\s+\[\[/.test(cell));
  const entry = imbuements.get(name) ?? {
    name,
    availableFor: stripMarkup(cells[sourcesIndex + 1]),
    tiers: [],
  };

  entry.tiers[TIERS.indexOf(tier)] = {
    effect: cells.slice(0, sourcesIndex).map(stripMarkup).join(' / '),
    sources: parseSources(cells[sourcesIndex]),
  };
  imbuements.set(name, entry);
}

const list = [...imbuements.values()].sort((a, b) => a.name.localeCompare(b.name));

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify(
    {
      source: 'https://tibia.fandom.com/wiki/Imbuing',
      license: 'CC-BY-SA',
      fetchedAt: new Date().toISOString().slice(0, 10),
      imbuements: list,
    },
    null,
    2,
  )}\n`,
);

console.log(`${list.length} imbuements saved`);
