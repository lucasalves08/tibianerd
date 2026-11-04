// Generates src/data/creatures.json from TibiaWiki (CC-BY-SA).
// Run with: node scripts/fetch-creatures.mjs

import { writeFile } from 'node:fs/promises';

const API_URL = 'https://tibia.fandom.com/api.php';
const OUTPUT_PATH = 'src/data/creatures.json';
const BESTIARY_OUTPUT_PATH = 'src/data/bestiary.json';
const BATCH_SIZE = 50;
const REQUEST_DELAY_MS = 300;
const ELEMENTS = ['physical', 'earth', 'fire', 'energy', 'ice', 'death', 'holy'];

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

function readField(wikitext, field) {
  const match = wikitext.match(new RegExp(`^\\|\\s*${field}\\s*=\\s*(.*)$`, 'mi'));

  return match?.[1].trim() ?? '';
}

function parseBestiaryEntry(title, wikitext) {
  const isBoss = readField(wikitext, 'isboss').toLowerCase() === 'yes';
  const creatureClass = readField(wikitext, 'bestiaryclass');
  const difficulty = readField(wikitext, 'bestiarylevel');
  const occurrence = readField(wikitext, 'occurrence');

  if (isBoss || !creatureClass || !difficulty) {
    return null;
  }

  return [
    readField(wikitext, 'name') || title,
    creatureClass,
    difficulty,
    occurrence === 'Very Rare' ? 1 : 0,
  ];
}

function parseCreature(title, wikitext) {
  const hitPoints = Number(readField(wikitext, 'hp').replaceAll(',', ''));
  const isBoss = readField(wikitext, 'isboss').toLowerCase() === 'yes';
  const hasBestiaryEntry = readField(wikitext, 'bestiaryclass') !== '';

  if (!hitPoints || isBoss || !hasBestiaryEntry) {
    return null;
  }

  const modifiers = ELEMENTS.map((element) =>
    Number.parseInt(readField(wikitext, `${element}DmgMod`), 10),
  );

  if (modifiers.some(Number.isNaN)) {
    return null;
  }

  return [readField(wikitext, 'name') || title, hitPoints, ...modifiers];
}

async function fetchCreatures(titles) {
  const creatures = [];
  const bestiary = [];

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
      const creature = parseCreature(page.title, wikitext);

      const entry = parseBestiaryEntry(page.title, wikitext);

      if (creature) {
        creatures.push(creature);
      }

      if (entry) {
        bestiary.push(entry);
      }
    }
  }

  const byName = ([a], [b]) => a.localeCompare(b);

  return {
    creatures: creatures.sort(byName),
    bestiary: bestiary.sort(byName),
  };
}

const titles = await listCreatureTitles();
const { creatures, bestiary } = await fetchCreatures(titles);
const fetchedAt = new Date().toISOString().slice(0, 10);

await writeFile(
  BESTIARY_OUTPUT_PATH,
  `${JSON.stringify({
    source: 'https://tibia.fandom.com',
    license: 'CC-BY-SA',
    fetchedAt,
    entries: bestiary,
  })}\n`,
);

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({
    source: 'https://tibia.fandom.com',
    license: 'CC-BY-SA',
    fetchedAt,
    elements: ELEMENTS,
    creatures,
  })}\n`,
);

console.log(
  `${creatures.length} creatures and ${bestiary.length} Bestiary entries saved from ${titles.length} pages`,
);
