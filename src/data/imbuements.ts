import imbuementData from './imbuements.json';

export const tierNames = ['Basic', 'Intricate', 'Powerful'] as const;

export const shrineFees = [7500, 60000, 250000] as const;

export const IMBUEMENT_HOURS = 20;

export const TOKENS_PER_TIER_STEP = 2;

export const tokenImbuements = ['Strike', 'Vampirism', 'Void'];

export interface ImbuementSource {
  item: string;
  amount: number;
}

export interface ImbuementTier {
  effect: string;
  sources: ImbuementSource[];
}

export interface Imbuement {
  name: string;
  availableFor: string;
  tiers: ImbuementTier[];
}

export const imbuementDataDate = imbuementData.fetchedAt;

export const imbuements: Imbuement[] = imbuementData.imbuements;

export function getIconPath(name: string): string {
  return `/icons/imbuements/${name.toLowerCase().replaceAll(' ', '-')}.webp`;
}
