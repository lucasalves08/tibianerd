import type { Tool } from '../data/tools';

export interface TextPart {
  text: string;
  match: boolean;
}

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function getTerms(query: string): string[] {
  return fold(query).trim().split(/\s+/).filter(Boolean);
}

export function searchTools(tools: Tool[], query: string): Tool[] {
  const terms = getTerms(query);

  if (terms.length === 0) {
    return tools;
  }

  return tools.filter((tool) => {
    const searchable = fold(
      [tool.name, tool.description, ...tool.keywords].join(' '),
    );

    return terms.every((term) => searchable.includes(term));
  });
}

export function highlightMatches(text: string, query: string): TextPart[] {
  const characters = [...text];
  const folded: string[] = [];
  const owners: number[] = [];

  characters.forEach((character, index) => {
    for (const foldedCharacter of fold(character)) {
      folded.push(foldedCharacter);
      owners.push(index);
    }
  });

  const haystack = folded.join('');
  const matched = new Array<boolean>(characters.length).fill(false);

  for (const term of getTerms(query)) {
    let start = haystack.indexOf(term);

    while (start !== -1) {
      for (let i = start; i < start + term.length; i += 1) {
        const owner = owners[i];

        if (owner !== undefined) {
          matched[owner] = true;
        }
      }

      start = haystack.indexOf(term, start + term.length);
    }
  }

  const parts: TextPart[] = [];

  characters.forEach((character, index) => {
    const match = matched[index] ?? false;
    const last = parts.at(-1);

    if (last?.match === match) {
      last.text += character;
    } else {
      parts.push({ text: character, match });
    }
  });

  return parts;
}
