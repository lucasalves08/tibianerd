import {
  IMBUEMENT_HOURS,
  shrineFees,
  TOKENS_PER_TIER_STEP,
  tokenImbuements,
  type Imbuement,
} from '../data/imbuements';

export type ItemPrices = Record<string, number>;

export interface ImbuementCost {
  missingItems: string[];
  itemsCost?: number;
  shrineFee: number;
  total?: number;
  perHour?: number;
}

export interface TokenComparison {
  tokens: number;
  tokensCost: number;
  total: number;
  savings?: number;
}

export function getImbuementCost(
  imbuement: Imbuement,
  tierIndex: number,
  prices: ItemPrices,
): ImbuementCost {
  const { sources } = imbuement.tiers[tierIndex]!;
  const shrineFee = shrineFees[tierIndex]!;
  const missingItems = sources
    .filter(({ item }) => !prices[item])
    .map(({ item }) => item);

  if (missingItems.length > 0) {
    return { missingItems, shrineFee };
  }

  const itemsCost = sources.reduce(
    (sum, { item, amount }) => sum + prices[item]! * amount,
    0,
  );
  const total = itemsCost + shrineFee;

  return {
    missingItems,
    itemsCost,
    shrineFee,
    total,
    perHour: total / IMBUEMENT_HOURS,
  };
}

export function hasTokenOption(imbuement: Imbuement): boolean {
  return tokenImbuements.includes(imbuement.name);
}

export function compareWithTokens(
  imbuement: Imbuement,
  tierIndex: number,
  tokenPrice: number,
  marketTotal?: number,
): TokenComparison | undefined {
  if (!hasTokenOption(imbuement) || !tokenPrice) {
    return undefined;
  }

  const tokens = (tierIndex + 1) * TOKENS_PER_TIER_STEP;
  const tokensCost = tokens * tokenPrice;
  const total = tokensCost + shrineFees[tierIndex]!;

  return {
    tokens,
    tokensCost,
    total,
    savings: marketTotal === undefined ? undefined : marketTotal - total,
  };
}
