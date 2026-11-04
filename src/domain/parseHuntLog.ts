export interface HuntKill {
  name: string;
  kills: number;
}

// Reads the "Killed Monsters" section of a Hunt Analyzer log.
export function parseHuntLog(log: string): HuntKill[] {
  const lines = log.split(/\r?\n/);
  const start = lines.findIndex((line) => /killed monsters/i.test(line));
  const kills: HuntKill[] = [];

  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s*([\d.,]+)x\s+(.+?)\s*$/);

    if (match) {
      kills.push({
        name: match[2]!,
        kills: Number(match[1]!.replace(/[.,]/g, '')),
      });
    } else if (start >= 0 && line.trim().endsWith(':')) {
      break;
    }
  }

  return kills;
}
