import { elements, type Creature, type Element } from '../data/creatures';
import { huntVocations, type Hunt, type HuntVocationId } from '../data/hunts';
import { fold, foldForSearch } from './fold';

export interface HuntFilters {
  vocation: HuntVocationId;
  level: number | null;
  city: string;
  element: Element | '';
  query: string;
}

export function getMinimumLevel(
  hunt: Hunt,
  vocation: HuntVocationId,
): number | null {
  const { levelIndex } = huntVocations.find(({ id }) => id === vocation)!;

  return hunt.levels[levelIndex] ?? null;
}

// Averages the creatures we know, since a spot rewards what works on most of them.
export function getBestElements(
  hunt: Hunt,
  creaturesByName: Map<string, Creature>,
): Element[] {
  const known = hunt.creatureNames.flatMap((name) => {
    const creature = creaturesByName.get(fold(name));

    return creature ? [creature] : [];
  });

  if (known.length === 0) {
    return [];
  }

  const averages = elements.map((element) => ({
    element,
    average:
      known.reduce((sum, { modifiers }) => sum + modifiers[element], 0) /
      known.length,
  }));
  const best = Math.max(...averages.map(({ average }) => average));

  return averages
    .filter(({ average }) => average === best)
    .map(({ element }) => element);
}

export function findHunts(
  hunts: Hunt[],
  filters: HuntFilters,
  creaturesByName: Map<string, Creature>,
): Hunt[] {
  const { vocation, level, city, element, query } = filters;
  const term = foldForSearch(query.trim());

  return hunts
    .filter((hunt) => {
      const minimum = getMinimumLevel(hunt, vocation);
      const hasNoLevels = hunt.levels.every((value) => value === null);

      return (
        (hasNoLevels ||
          (minimum !== null && (level === null || minimum <= level))) &&
        (!city || hunt.city === city) &&
        (!term || foldForSearch(hunt.name).includes(term)) &&
        (!element || getBestElements(hunt, creaturesByName).includes(element))
      );
    })
    .sort(
      (a, b) =>
        (getMinimumLevel(b, vocation) ?? 0) -
          (getMinimumLevel(a, vocation) ?? 0) ||
        (b.experienceRating ?? 0) - (a.experienceRating ?? 0),
    );
}
