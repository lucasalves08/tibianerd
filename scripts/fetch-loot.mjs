// Generates src/data/lootRarity.json from TibiaWiki (CC-BY-SA).
// Keeps the items that are rare or very rare for some creature, with how
// often every creature drops them, so a common drop elsewhere wins.
// Run with: node scripts/fetch-loot.mjs

import { writeFile } from 'node:fs/promises';

const API_URL = 'https://tibia.fandom.com/api.php';
const OUTPUT_PATH = 'src/data/lootRarity.json';
const BATCH_SIZE = 50;
const REQUEST_DELAY_MS = 300;
const RARITIES = { rare: 1, 'very rare': 2 };
const MORE_COMMON = 0;

async function queryWiki(params) {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({ format: 'json', ...params }).toString();

  const response = await fetch(url, {
    headers: { 'User-Agent': 'TibiaNerd data script (fan site)' },
  });

  if (!response.ok) {
    throw new Error(`TibiaWiki answered ${response.status}`);
  }

  await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));

  return response.json();
}

async function listCreatureTitles() {
  const titles = [];
  let cursor = {};

  do {
    const data = await queryWiki({
      action: 'query',
      list: 'categorymembers',
      cmtitle: 'Category:Creatures',
      cmnamespace: '0',
      cmlimit: '500',
      ...cursor,
    });

    titles.push(...data.query.categorymembers.map((page) => page.title));
    cursor = data.continue ?? null;
  } while (cursor);

  return titles;
}

function readName(title, wikitext) {
  const match = wikitext.match(/^\|\s*name\s*=[ \t]*(.*)$/im);

  return match?.[1].trim() || title;
}

// A loot line looks like {{Loot Item|1-2|Onyx Chip|semi-rare}}, and the
// amount and the rarity are optional.
function readLoot(wikitext) {
  const loot = [];

  for (const [, body] of wikitext.matchAll(/\{\{Loot Item\|([^}]*)\}\}/gi)) {
    const parts = body.split('|').map((part) => part.trim());
    const rarity = RARITIES[parts.at(-1).toLowerCase()] ?? MORE_COMMON;
    const item = /^[\d-]+$/.test(parts[0]) ? parts[1] : parts[0];

    if (item) {
      loot.push([item.toLowerCase(), rarity]);
    }
  }

  return loot;
}

async function fetchLoot(titles) {
  const creatures = {};

  for (let start = 0; start < titles.length; start += BATCH_SIZE) {
    const data = await queryWiki({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: titles.slice(start, start + BATCH_SIZE).join('|'),
    });

    for (const page of Object.values(data.query.pages)) {
      const wikitext = page.revisions?.[0].slots.main['*'] ?? '';
      const loot = readLoot(wikitext);

      if (loot.length > 0) {
        creatures[readName(page.title, wikitext)] = loot;
      }
    }
  }

  const rareItems = new Set(
    Object.values(creatures).flatMap((loot) =>
      loot.filter(([, rarity]) => rarity !== MORE_COMMON).map(([item]) => item),
    ),
  );

  return Object.fromEntries(
    Object.entries(creatures)
      .map(([name, loot]) => [name, loot.filter(([item]) => rareItems.has(item))])
      .filter(([, loot]) => loot.length > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

const titles = await listCreatureTitles();
const creatures = await fetchLoot(titles);

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({
    source: 'https://tibia.fandom.com',
    license: 'CC-BY-SA',
    fetchedAt: new Date().toISOString().slice(0, 10),
    rarities: { 0: 'more common', 1: 'rare', 2: 'very rare' },
    creatures,
  })}\n`,
);

console.log(
  `Rare loot of ${Object.keys(creatures).length} creatures saved from ${titles.length} pages`,
);
