import { describe, expect, it } from 'vitest';
import type { Tool } from '../data/tools';
import { highlightMatches, searchTools } from './searchTools';

const tools: Tool[] = [
  {
    id: 'charms',
    name: 'Charms',
    description: 'Melhor distribuição',
    keywords: ['otimizador'],
  },
  {
    id: 'monsters',
    name: 'Consulta de monstros',
    description: 'Resistências',
    keywords: ['criatura'],
  },
];

const ids = (query: string) => searchTools(tools, query).map((tool) => tool.id);

describe('searchTools', () => {
  it('returns every tool for an empty query', () => {
    expect(ids('   ')).toEqual(['charms', 'monsters']);
  });

  it('ignores case', () => {
    expect(ids('CHARMS')).toEqual(['charms']);
  });

  it('ignores accents in both directions', () => {
    expect(ids('resistencias')).toEqual(['monsters']);
    expect(ids('distribuição')).toEqual(['charms']);
    expect(ids('distribuicao')).toEqual(['charms']);
  });

  it('searches keywords', () => {
    expect(ids('criatura')).toEqual(['monsters']);
  });

  it('requires every term to match', () => {
    expect(ids('consulta criatura')).toEqual(['monsters']);
    expect(ids('consulta otimizador')).toEqual([]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(ids('rashid')).toEqual([]);
  });
});

describe('highlightMatches', () => {
  it('returns the whole text unmarked for an empty query', () => {
    expect(highlightMatches('Charms', ' ')).toEqual([
      { text: 'Charms', match: false },
    ]);
  });

  it('marks matches and keeps the original text', () => {
    expect(highlightMatches('Melhor charm', 'CHARM')).toEqual([
      { text: 'Melhor ', match: false },
      { text: 'charm', match: true },
    ]);
  });

  it('keeps accents when the query has none', () => {
    expect(highlightMatches('Resistências', 'resistencias')).toEqual([
      { text: 'Resistências', match: true },
    ]);
  });

  it('marks every term and every occurrence', () => {
    expect(highlightMatches('hp e hp e mana', 'hp mana')).toEqual([
      { text: 'hp', match: true },
      { text: ' e ', match: false },
      { text: 'hp', match: true },
      { text: ' e ', match: false },
      { text: 'mana', match: true },
    ]);
  });
});
