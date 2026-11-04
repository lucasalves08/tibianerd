import { describe, expect, it } from 'vitest';
import type { Tool } from '../data/tools';
import { searchTools } from './searchTools';

const tools: Tool[] = [
  {
    id: 'charms',
    name: 'Charms',
    description: 'Melhor distribuição',
    keywords: ['otimizador'],
  },
  {
    id: 'monstros',
    name: 'Consulta de monstros',
    description: 'Resistências',
    keywords: ['criatura'],
  },
];

const ids = (query: string) => searchTools(tools, query).map((tool) => tool.id);

describe('searchTools', () => {
  it('retorna tudo quando a busca está vazia', () => {
    expect(ids('   ')).toEqual(['charms', 'monstros']);
  });

  it('ignora maiúsculas', () => {
    expect(ids('CHARMS')).toEqual(['charms']);
  });

  it('ignora acentos nos dois sentidos', () => {
    expect(ids('resistencias')).toEqual(['monstros']);
    expect(ids('distribuição')).toEqual(['charms']);
    expect(ids('distribuicao')).toEqual(['charms']);
  });

  it('busca nas palavras-chave', () => {
    expect(ids('criatura')).toEqual(['monstros']);
  });

  it('exige todos os termos', () => {
    expect(ids('consulta criatura')).toEqual(['monstros']);
    expect(ids('consulta otimizador')).toEqual([]);
  });

  it('retorna lista vazia sem resultado', () => {
    expect(ids('rashid')).toEqual([]);
  });
});
