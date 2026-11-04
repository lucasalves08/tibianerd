// Generates src/data/hunts.json from TibiaWiki (CC-BY-SA).
// Run with: node scripts/fetch-hunts.mjs

import { writeFile } from 'node:fs/promises';

const API_URL = 'https://tibia.fandom.com/api.php';
const OUTPUT_PATH = 'src/data/hunts.json';
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

function parseHunt(title, wikitext) {
  if (!wikitext.includes('{{Infobox Hunt')) {
    return null;
  }

  const levels = ['lvlknights', 'lvlpaladins', 'lvlmages'].map((field) =>
    readNumber(wikitext, field),
  );

  if (levels.every((level) => level === null)) {
    return null;
  }

  return [
    readField(wikitext, 'name') || title,
    readField(wikitext, 'city'),
    ...levels,
    readNumber(wikitext, 'expstar'),
    readNumber(wikitext, 'lootstar'),
    readCreatures(wikitext),
  ];
}

async function fetchHunts(titles) {
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
      const hunt = parseHunt(page.title, page.revisions?.[0].slots.main['*'] ?? '');

      if (hunt) {
        hunts.push(hunt);
      }
    }
  }

  return hunts.sort(([a], [b]) => a.localeCompare(b));
}

const titles = await listHuntTitles();
const hunts = await fetchHunts(titles);

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({
    source: 'https://tibia.fandom.com/wiki/Hunting_Places',
    license: 'CC-BY-SA',
    fetchedAt: new Date().toISOString().slice(0, 10),
    hunts,
  })}\n`,
);

console.log(`${hunts.length} of ${titles.length} hunting places saved`);
