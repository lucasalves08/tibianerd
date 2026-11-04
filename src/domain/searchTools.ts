import type { Tool } from '../data/tools';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function searchTools(tools: Tool[], query: string): Tool[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return tools;
  }

  return tools.filter((tool) => {
    const searchable = normalize(
      [tool.name, tool.description, ...tool.keywords].join(' '),
    );

    return terms.every((term) => searchable.includes(term));
  });
}
