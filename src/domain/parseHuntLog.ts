export interface HuntKill {
  name: string;
  kills: number;
}

export interface HuntEntry {
  name: string;
  count: number;
}

// Reads a "12x name" list of a Hunt Analyser log, up to the next section.
export function parseHuntSection(log: string, title: RegExp): HuntEntry[] {
  const lines = log.split(/\r?\n/);
  const start = lines.findIndex((line) => title.test(line));
  const entries: HuntEntry[] = [];

  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s*([\d.,]+)x\s+(.+?)\s*$/);

    if (match) {
      entries.push({
        name: match[2]!,
        count: Number(match[1]!.replace(/[.,]/g, '')),
      });
    } else if (start >= 0 && line.trim().endsWith(':')) {
      break;
    }
  }

  return entries;
}

// Reads the "Killed Monsters" section of a Hunt Analyzer log.
export function parseHuntLog(log: string): HuntKill[] {
  return parseHuntSection(log, /killed monsters/i).map(({ name, count }) => ({
    name,
    kills: count,
  }));
}
