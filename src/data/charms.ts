import type { Element } from './creatures';

export const tierChances = [0.05, 0.1, 0.11] as const;

export type Tier = 1 | 2 | 3;

export interface Charm {
  id: string;
  name: string;
  element?: Element;
}

export function getCharmIconPath(id: string): string {
  return `/icons/charms/${id}.webp`;
}

export const charms: Charm[] = [
  { id: 'wound', name: 'Wound', element: 'physical' },
  { id: 'enflame', name: 'Enflame', element: 'fire' },
  { id: 'poison', name: 'Poison', element: 'earth' },
  { id: 'freeze', name: 'Freeze', element: 'ice' },
  { id: 'zap', name: 'Zap', element: 'energy' },
  { id: 'curse', name: 'Curse', element: 'death' },
  { id: 'divine-wrath', name: 'Divine Wrath', element: 'holy' },
  { id: 'overpower', name: 'Overpower' },
  { id: 'overflux', name: 'Overflux' },
];
