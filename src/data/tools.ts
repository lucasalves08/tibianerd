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
}

export const tools: Tool[] = [
  {
    id: 'charms',
    category: 'hunt',
    name: 'Charms',
    shortName: 'Charms',
    description: 'O que usar em cada monstro e o que comprar com seus pontos.',
    href: '/tools/charms',
  },
  {
    id: 'monsters',
    category: 'reference',
    name: 'Consulta de monstros',
    shortName: 'Monstros',
    description: 'HP, resistências e melhor charm de cada criatura.',
    href: '/tools/monsters',
  },
  {
    id: 'bestiary',
    category: 'character',
    name: 'Bestiary',
    shortName: 'Bestiary',
    description: 'Marque seu progresso e veja o que falta para ganhar pontos.',
    href: '/tools/bestiary',
  },
  {
    id: 'exercise',
    category: 'character',
    name: 'Calculadora de exercise',
    shortName: 'Exercise',
    description: 'Armas, custo e tempo até a skill desejada.',
    href: '/tools/exercise',
  },
  {
    id: 'imbuements',
    category: 'reference',
    name: 'Imbuements',
    shortName: 'Imbuements',
    description: 'Consulte itens e compare market com gold token.',
    href: '/tools/imbuements',
  },
  {
    id: 'hunting-places',
    category: 'hunt',
    name: 'Hunting places',
    shortName: 'Hunting places',
    description: 'Encontre spots por vocação, nível e tipo de dano.',
    href: '/tools/hunting-places',
  },
];
