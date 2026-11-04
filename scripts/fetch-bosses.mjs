// Generates src/data/bosses.json from TibiaWiki (CC-BY-SA).
// Run with: node scripts/fetch-bosses.mjs

import { writeFile } from 'node:fs/promises';

const API_URL = 'https://tibia.fandom.com/api.php';
const OUTPUT_PATH = 'src/data/bosses.json';
const REQUEST_DELAY_MS = 300;

async function listBosses() {
  const names = [];
  let cursor = {};

  do {
    const url = new URL(API_URL);

    url.search = new URLSearchParams({
      format: 'json',
      action: 'query',
      list: 'categorymembers',
      cmtitle: 'Category:Bosses',
      cmnamespace: '0',
      cmlimit: '500',
      ...cursor,
    }).toString();

    const response = await fetch(url, {
      headers: { 'User-Agent': 'TibiaNerd data script (fan site)' },
    });

    if (!response.ok) {
      throw new Error(`TibiaWiki answered ${response.status}`);
    }

    const data = await response.json();

    names.push(...data.query.categorymembers.map(({ title }) => title));
    cursor = data.continue ?? null;
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
  } while (cursor);

  return names.filter((name) => !name.includes('/')).sort();
}

const bosses = await listBosses();

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({
    source: 'https://tibia.fandom.com/wiki/Category:Bosses',
    license: 'CC-BY-SA',
    fetchedAt: new Date().toISOString().slice(0, 10),
    bosses,
  })}\n`,
);

console.log(`${bosses.length} bosses saved`);
