import { describe, expect, it } from 'vitest';
import { parseHuntLog } from './parseHuntLog';

describe('parseHuntLog', () => {
  it('reads the killed monsters section', () => {
    const log = [
      'Session: 01:00h',
      'Loot: 1,000',
      'Killed Monsters:',
      '  251x darklight striker',
      '  1,160x walking pillar',
      'Looted Items:',
      '  12x gold coin',
    ].join('\r\n');

    expect(parseHuntLog(log)).toEqual([
      { name: 'darklight striker', kills: 251 },
      { name: 'walking pillar', kills: 1160 },
    ]);
  });

  it('accepts a bare list of monsters', () => {
    expect(parseHuntLog('10x dragon\n5x dragon lord')).toEqual([
      { name: 'dragon', kills: 10 },
      { name: 'dragon lord', kills: 5 },
    ]);
  });

  it('returns nothing for unrelated text', () => {
    expect(parseHuntLog('hello')).toEqual([]);
  });
});
