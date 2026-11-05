export interface HuntPlayer {
  name: string;
  balance: number;
}

export interface PartyHunt {
  fingerprint: string;
  sessionStart: string | null;
  duration: string | null;
  players: HuntPlayer[];
}

export interface LootTransfer {
  from: string;
  to: string;
  amount: number;
}

export interface LootSplit {
  total: number;
  share: number;
  transfers: LootTransfer[];
}

const MIN_PLAYERS = 2;

const parseAmount = (value: string): number | null =>
  /^-?[\d.,]+$/.test(value) ? Number(value.replace(/[.,]/g, '')) : null;

// Reads the text copied from the Party Hunt Analyser. Player names sit on their
// own line and never hold a colon, which tells them apart from every field.
export const parsePartyHunt = (text: string): PartyHunt | null => {
  let sessionStart: string | null = null;
  let sessionEnd: string | null = null;
  let duration: string | null = null;
  let hasBalance = false;
  const players: (HuntPlayer & { loot: number; supplies: number })[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const session = line.match(/^Session data:\s*From\s+(.+?)\s+to\s+(.+)$/i);
    const length = line.match(/^Session:\s*(.+)$/i);
    const field = line.match(/^(Loot|Supplies|Balance):\s*(.+)$/i);
    const player = players.at(-1);

    if (session) {
      sessionStart = session[1]!;
      sessionEnd = session[2]!;
    } else if (length) {
      duration = length[1]!;
    } else if (field && player) {
      const amount = parseAmount(field[2]!.trim()) ?? 0;
      const name = field[1]!.toLowerCase();

      if (name === 'loot') {
        player.loot = amount;
      } else if (name === 'supplies') {
        player.supplies = amount;
      } else {
        player.balance = amount;
        hasBalance = true;
      }
    } else if (line && !line.includes(':')) {
      players.push({
        name: line.replace(/\s*\(leader\)\s*$/i, ''),
        balance: 0,
        loot: 0,
        supplies: 0,
      });
    }
  }

  if (players.length < MIN_PLAYERS) {
    return null;
  }

  const balances = players.map(({ name, balance, loot, supplies }) => ({
    name,
    balance: hasBalance ? balance : loot - supplies,
  }));

  if (balances.every(({ balance }) => balance === 0)) {
    return null;
  }

  return {
    fingerprint: [
      sessionStart,
      sessionEnd,
      ...balances.map(({ name, balance }) => `${name}=${balance}`),
    ].join('|'),
    sessionStart,
    duration,
    players: balances,
  };
};

// Whoever holds more than an equal share pays those who hold less, largest
// amounts first, which keeps the number of transfers small.
export const getLootSplit = (players: HuntPlayer[]): LootSplit => {
  const total = players.reduce((sum, { balance }) => sum + balance, 0);
  const share = Math.floor(total / players.length);
  const byExtra = players
    .map(({ name, balance }) => ({ name, extra: balance - share }))
    .sort((first, second) => second.extra - first.extra);
  const payers = byExtra.filter(({ extra }) => extra > 0);
  const receivers = byExtra.filter(({ extra }) => extra < 0).reverse();
  const transfers: LootTransfer[] = [];

  for (const receiver of receivers) {
    let missing = -receiver.extra;

    for (const payer of payers) {
      const amount = Math.min(missing, payer.extra);

      if (amount > 0) {
        transfers.push({ from: payer.name, to: receiver.name, amount });
        payer.extra -= amount;
        missing -= amount;
      }
    }
  }

  return { total, share, transfers };
};

/** Turns "2026-11-05, 14:03:20" into "05/11 às 14:03", or keeps the text. */
export const formatHuntStart = (value: string): string => {
  const match = value.match(/^\d{4}-(\d{2})-(\d{2}),?\s+(\d{2}:\d{2})/);

  return match ? `${match[2]}/${match[1]} às ${match[3]}` : value;
};
