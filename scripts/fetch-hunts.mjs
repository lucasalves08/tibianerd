// Generates src/data/hunts.json from TibiaWiki (CC-BY-SA), with spawn counts
// estimated from the open Global map replica of Canary (GPL-2.0).
// Run with: node scripts/fetch-hunts.mjs

import { writeFile } from 'node:fs/promises';

const API_URL = 'https://tibia.fandom.com/api.php';
const SPAWNS_URL =
  'https://raw.githubusercontent.com/opentibiabr/canary/main/data-otservbr-global/world/otservbr-monster.xml';
const OUTPUT_PATH = 'src/data/hunts.json';
// How far from a coordinate on the hunting place page a spawn still counts.
const SPAWN_RADIUS = 48;
const SECTOR_SIZE = 256;
const BATCH_SIZE = 50;
const REQUEST_DELAY_MS = 300;

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

async function listHuntTitles() {
  const titles = [];
  let cursor = {};

  do {
    const data = await queryWiki({
      action: 'query',
      list: 'categorymembers',
      cmtitle: 'Category:Hunting Places',
      cmnamespace: '0',
      cmlimit: '500',
      ...cursor,
    });

    titles.push(...data.query.categorymembers.map((page) => page.title));
    cursor = data.continue ?? null;
  } while (cursor);

  return titles.filter((title) => title !== 'Hunting Places');
}

function readField(wikitext, field) {
  const match = wikitext.match(new RegExp(`^\\|\\s*${field}\\s*=[ \\t]*(.*)$`, 'mi'));

  return match?.[1].trim() ?? '';
}

function readNumber(wikitext, field) {
  const match = readField(wikitext, field).replaceAll(',', '').match(/\d+/);

  return match ? Number(match[0]) : null;
}

function readCreatures(wikitext) {
  const names = new Set();

  for (const [block] of wikitext.matchAll(/\{\{CreatureList[\s\S]*?\}\}/g)) {
    for (const [, name] of block.matchAll(/\|\s*([A-Z][^|=\n}]*?)\s*(?=[|\n}])/g)) {
      if (!name.startsWith('List')) {
        names.add(name);
      }
    }
  }

  return [...names];
}

function readCoordinates(wikitext) {
  return [
    ...wikitext.matchAll(/(?:Mapper Coords\||coords=)(\d+)\.(\d+)[|,](\d+)\.(\d+)/g),
  ].map(([, xSector, xTile, ySector, yTile]) => ({
    x: Number(xSector) * SECTOR_SIZE + Number(xTile),
    y: Number(ySector) * SECTOR_SIZE + Number(yTile),
  }));
}

async function fetchSpawns() {
  const response = await fetch(SPAWNS_URL);

  if (!response.ok) {
    throw new Error(`Canary answered ${response.status}`);
  }

  const spawns = new Map();
  const xml = await response.text();
  const areas = xml.matchAll(
    /<monster centerx="(\d+)" centery="(\d+)"[^>]*>([\s\S]*?)<\/monster>/g,
  );

  for (const [, centerX, centerY, body] of areas) {
    for (const [, name, x, y] of body.matchAll(
      /<monster name="([^"]+)" x="(-?\d+)" y="(-?\d+)"/g,
    )) {
      const key = name.toLowerCase();

      spawns.set(key, [
        ...(spawns.get(key) ?? []),
        { x: Number(centerX) + Number(x), y: Number(centerY) + Number(y) },
      ]);
    }
  }

  return spawns;
}

function countSpawns(name, coordinates, spawns) {
  return (spawns.get(name.toLowerCase()) ?? []).filter((spawn) =>
    coordinates.some(
      ({ x, y }) =>
        Math.abs(spawn.x - x) <= SPAWN_RADIUS &&
        Math.abs(spawn.y - y) <= SPAWN_RADIUS,
    ),
  ).length;
}

function parseHunt(title, wikitext, spawns) {
  if (!wikitext.includes('{{Infobox Hunt')) {
    return null;
  }

  const levels = ['lvlknights', 'lvlpaladins', 'lvlmages'].map((field) =>
    readNumber(wikitext, field),
  );

  const creatureNames = readCreatures(wikitext);
  const coordinates = readCoordinates(wikitext);

  return [
    (readField(wikitext, 'name') || title).replace(/\s*<br\s*\/?>\s*/gi, ': '),
    readField(wikitext, 'city'),
    ...levels,
    readNumber(wikitext, 'expstar'),
    readNumber(wikitext, 'lootstar'),
    creatureNames,
    creatureNames.map((name) => countSpawns(name, coordinates, spawns)),
  ];
}

async function fetchHunts(titles, spawns) {
  const hunts = [];

  for (let start = 0; start < titles.length; start += BATCH_SIZE) {
    const data = await queryWiki({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: titles.slice(start, start + BATCH_SIZE).join('|'),
    });

    for (const page of Object.values(data.query.pages)) {
      const hunt = parseHunt(
        page.title,
        page.revisions?.[0].slots.main['*'] ?? '',
        spawns,
      );

      if (hunt) {
        hunts.push(hunt);
      }
    }
  }

  // Sub-pages can repeat a name, so the entry with levels wins.
  const byName = new Map();

  for (const hunt of hunts) {
    if (!byName.has(hunt[0]) || hunt.slice(2, 5).some((level) => level !== null)) {
      byName.set(hunt[0], hunt);
    }
  }

  return [...byName.values()].sort(([a], [b]) => a.localeCompare(b));
}

const titles = await listHuntTitles();
const hunts = await fetchHunts(titles, await fetchSpawns());

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({
    source: 'https://tibia.fandom.com/wiki/Hunting_Places',
    license: 'CC-BY-SA',
    spawnSource: 'https://github.com/opentibiabr/canary',
    spawnLicense: 'GPL-2.0',
    fetchedAt: new Date().toISOString().slice(0, 10),
    hunts,
  })}\n`,
);

console.log(`${hunts.length} of ${titles.length} hunting places saved`);
