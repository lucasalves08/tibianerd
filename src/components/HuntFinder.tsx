import { useEffect, useMemo, useState } from 'react';
import { creatures, elements, type Element } from '../data/creatures';
import {
  huntCities,
  huntDataDate,
  hunts,
  huntVocations,
  type Hunt,
  type HuntVocationId,
} from '../data/hunts';
import {
  findHunts,
  getBestElements,
  getMinimumLevel,
} from '../domain/huntFinder';
import { fold } from '../domain/searchTools';
import styles from './HuntFinder.module.css';

const STORAGE_KEY = 'tibianerd:hunts';
const PAGE_SIZE = 30;
const WIKI_URL = 'https://tibia.fandom.com/wiki/';

const elementNames: Record<Element, string> = {
  physical: 'Físico',
  earth: 'Terra',
  fire: 'Fogo',
  energy: 'Energia',
  ice: 'Gelo',
  death: 'Morte',
  holy: 'Sagrado',
};

const creaturesByName = new Map(
  creatures.map((creature) => [fold(creature.name), creature]),
);

const formatRating = (rating: number | null) =>
  rating === null ? 'sem nota' : `${rating} de 5`;

function HuntCard({
  hunt,
  vocation,
}: {
  hunt: Hunt;
  vocation: HuntVocationId;
}) {
  const bestElements = getBestElements(hunt, creaturesByName);

  return (
    <li className={styles.card}>
      <h2 className={styles.name}>
        <a
          href={`${WIKI_URL}${encodeURIComponent(hunt.name.replaceAll(' ', '_'))}`}
          rel="noopener"
        >
          {hunt.name}
        </a>
      </h2>
      <p className={styles.muted}>
        {[hunt.city, `Nível ${getMinimumLevel(hunt, vocation)}+`]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <p>
        Exp: {formatRating(hunt.experienceRating)} · Loot:{' '}
        {formatRating(hunt.lootRating)}
      </p>
      {bestElements.length > 0 && (
        <p>
          <strong>
            Melhor dano:{' '}
            {bestElements.map((element) => elementNames[element]).join(', ')}
          </strong>
        </p>
      )}
      {hunt.creatureNames.length > 0 && (
        <p className={styles.muted}>{hunt.creatureNames.join(', ')}</p>
      )}
    </li>
  );
}

export default function HuntFinder() {
  const [vocation, setVocation] = useState<HuntVocationId>('knight');
  const [level, setLevel] = useState('');
  const [city, setCity] = useState('');
  const [element, setElement] = useState<Element | ''>('');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Browser storage can be missing or blocked, and the tool works without it.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');

      if (saved.vocation) {
        setVocation(saved.vocation);
      }

      if (saved.level) {
        setLevel(saved.level);
      }
    } catch {
      // The defaults already work.
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ vocation, level }));
    } catch {
      // Nothing to do: the current page keeps working.
    }
  }, [vocation, level, isLoaded]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [vocation, level, city, element, query]);

  const results = useMemo(
    () =>
      findHunts(
        hunts,
        {
          vocation,
          level: level.trim() === '' ? null : Number(level),
          city,
          element,
          query,
        },
        creaturesByName,
      ),
    [vocation, level, city, element, query],
  );

  return (
    <div className={styles.tool}>
      <div className={styles.filters}>
        <label className={styles.field}>
          Vocação
          <select
            className={styles.input}
            value={vocation}
            onChange={(event) =>
              setVocation(event.target.value as HuntVocationId)
            }
          >
            {huntVocations.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Seu nível
          <input
            className={styles.input}
            type="number"
            inputMode="numeric"
            min="1"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          Melhor dano
          <select
            className={styles.input}
            value={element}
            onChange={(event) =>
              setElement(event.target.value as Element | '')
            }
          >
            <option value="">Todos</option>
            {elements.map((item) => (
              <option key={item} value={item}>
                {elementNames[item]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Cidade
          <select
            className={styles.input}
            value={city}
            onChange={(event) => setCity(event.target.value)}
          >
            <option value="">Todas</option>
            {huntCities.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Buscar spot
          <input
            className={styles.input}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <p className={styles.muted} role="status">
        {results.length === 1
          ? '1 spot encontrado'
          : `${results.length} spots encontrados`}
      </p>

      <ul className={styles.list}>
        {results.slice(0, visibleCount).map((hunt) => (
          <HuntCard key={hunt.name} hunt={hunt} vocation={vocation} />
        ))}
      </ul>

      {visibleCount < results.length && (
        <button
          className={styles.more}
          type="button"
          onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)}
        >
          Mostrar mais
        </button>
      )}

      <p className={styles.footnote}>
        O nível é uma recomendação mínima, e o Monk usa o nível do Knight. O
        melhor dano vem da média das resistências das criaturas. Valores do
        Tibia Global, conferidos em {huntDataDate.split('-').reverse().join('/')}
        , com dados da{' '}
        <a href="https://tibia.fandom.com/wiki/Hunting_Places" rel="noopener">
          TibiaWiki
        </a>
        .
      </p>
    </div>
  );
}
