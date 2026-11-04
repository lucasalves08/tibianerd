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
  description: string;
  keywords: string[];
  href?: string;
}

export const tools: Tool[] = [
  {
    id: 'charms',
    category: 'hunt',
    name: 'Charms',
    description: 'O que usar em cada monstro e o que comprar com seus pontos.',
    keywords: ['charm', 'planner', 'optimizer', 'otimizador', 'dano'],
    href: '/ferramentas/charms',
  },
  {
    id: 'monsters',
    category: 'reference',
    name: 'Consulta de monstros',
    description: 'HP, resistências e melhor charm de cada criatura.',
    keywords: ['monstro', 'criatura', 'creature', 'resistência', 'hp'],
  },
  {
    id: 'bestiary',
    category: 'character',
    name: 'Bestiary',
    description: 'Marque seu progresso e veja o que falta para ganhar pontos.',
    keywords: ['bestiário', 'charm points', 'pontos', 'kills'],
  },
  {
    id: 'exercise',
    category: 'character',
    name: 'Calculadora de exercise',
    description: 'Armas, custo e tempo até a skill desejada.',
    keywords: ['exercise', 'weapons', 'skill', 'treino', 'dummy'],
  },
  {
    id: 'imbuements',
    category: 'reference',
    name: 'Imbuements',
    description: 'Consulte itens e compare market com gold token.',
    keywords: ['imbue', 'imbuing', 'gold token', 'market', 'custo'],
    href: '/ferramentas/imbuements',
  },
  {
    id: 'hunting-places',
    category: 'hunt',
    name: 'Hunting places',
    description: 'Encontre spots por vocação, nível e tipo de dano.',
    keywords: ['hunt', 'spot', 'respawn', 'caça', 'vocação', 'nível'],
  },
];
