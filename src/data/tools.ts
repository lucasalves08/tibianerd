export const categories = [
  { id: 'hunt', name: 'Caça' },
  { id: 'character', name: 'Personagem' },
  { id: 'reference', name: 'Referência' },
] as const;

export type CategoryId = (typeof categories)[number]['id'];

export interface Tool {
  id: string;
  category: CategoryId;
  name: string;
  shortName: string;
  description: string;
  href: string;
  isUnderConstruction?: boolean;
}

export const tools: Tool[] = [
  {
    id: 'charms',
    category: 'hunt',
    name: 'Charms',
    shortName: 'Charms',
    description: 'O melhor charm para cada criatura da sua caçada.',
    href: '/tools/charms/',
  },
  {
    id: 'monsters',
    category: 'reference',
    name: 'Consulta de monstros',
    shortName: 'Monstros',
    description: 'HP, resistências, melhor charm e Charm Points de cada criatura.',
    href: '/tools/monsters/',
    isUnderConstruction: true,
  },
  {
    id: 'exercise',
    category: 'character',
    name: 'Calculadora de exercise',
    shortName: 'Exercise',
    description: 'Armas, custo e tempo até a skill desejada.',
    href: '/tools/exercise/',
    isUnderConstruction: true,
  },
  {
    id: 'imbuements',
    category: 'reference',
    name: 'Imbuements',
    shortName: 'Imbuements',
    description: 'Consulte itens e compare market com gold token.',
    href: '/tools/imbuements/',
    isUnderConstruction: true,
  },
  {
    id: 'hunting-places',
    category: 'hunt',
    name: 'Hunting places',
    shortName: 'Hunting places',
    description: 'Encontre spots por vocação, nível e tipo de dano.',
    href: '/tools/hunting-places/',
    isUnderConstruction: true,
  },
];
