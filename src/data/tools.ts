export interface Tool {
  id: string;
  name: string;
  description: string;
  keywords: string[];
}

export const tools: Tool[] = [
  {
    id: 'charms',
    name: 'Charms',
    description: 'O que usar em cada monstro e o que comprar com seus pontos.',
    keywords: ['charm', 'planner', 'optimizer', 'otimizador', 'dano'],
  },
  {
    id: 'monsters',
    name: 'Consulta de monstros',
    description: 'HP, resistências e melhor charm de cada criatura.',
    keywords: ['monstro', 'criatura', 'creature', 'resistência', 'hp'],
  },
  {
    id: 'bestiary',
    name: 'Bestiary',
    description: 'Marque seu progresso e veja o que falta para ganhar pontos.',
    keywords: ['bestiário', 'charm points', 'pontos', 'kills'],
  },
  {
    id: 'exercise',
    name: 'Calculadora de exercise',
    description: 'Armas, custo e tempo até a skill desejada.',
    keywords: ['exercise', 'weapons', 'skill', 'treino', 'dummy'],
  },
  {
    id: 'imbuements',
    name: 'Imbuements',
    description: 'Consulte itens e compare market com gold token.',
    keywords: ['imbue', 'imbuing', 'gold token', 'market', 'custo'],
  },
  {
    id: 'hunting-places',
    name: 'Hunting places',
    description: 'Encontre spots por vocação, nível e tipo de dano.',
    keywords: ['hunt', 'spot', 'respawn', 'caça', 'vocação', 'nível'],
  },
];
