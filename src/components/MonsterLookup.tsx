import { useEffect, useId, useMemo, useState } from 'react';
import { charms } from '../data/charms';
import { creatures, dataDate, type Creature } from '../data/creatures';
import { getBestElementalCharms } from '../domain/charmOptimizer';
import { fold } from '../domain/searchTools';
import CreatureResistances from './CreatureResistances';
import styles from './MonsterLookup.module.css';

const MAX_RESULTS = 12;
const URL_PARAM = 'creature';

const formatNumber = (value: number) => value.toLocaleString('pt-BR');

const findByName = (name: string | null): Creature | undefined =>
  name
    ? creatures.find((creature) => fold(creature.name) === fold(name))
    : undefined;

function CreatureDetails({ creature }: { creature: Creature }) {
  const best = getBestElementalCharms(charms, creature);

  return (
    <article className={styles.details}>
      <h2 className={styles.name}>{creature.name}</h2>
      <p className={styles.hitPoints}>
        {formatNumber(creature.hitPoints)} HP
      </p>
      <CreatureResistances creature={creature} />
      <div className={styles.pick}>
        <h3 className={styles.pickTitle}>Melhor charm elemental</h3>
        <p>
          {best.length > 0
            ? best.map(({ name }) => name).join(', ')
            : 'Nenhum: a criatura é imune a todos os elementos.'}
        </p>
      </div>
      <p className={styles.muted}>
        Overpower e Overflux ignoram resistências e podem render mais em
        criaturas com pouca vida. Compare no{' '}
        <a href="/tools/charms">otimizador de charms</a>.
      </p>
    </article>
  );
}

export default function MonsterLookup() {
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Creature>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setSelected(findByName(params.get(URL_PARAM)));
  }, []);

  const results = useMemo(() => {
    const term = fold(search.trim());

    return term
      ? creatures
          .filter((creature) => fold(creature.name).includes(term))
          .slice(0, MAX_RESULTS)
      : [];
  }, [search]);

  const selectCreature = (creature: Creature) => {
    const url = new URL(window.location.href);

    url.searchParams.set(URL_PARAM, creature.name);
    window.history.replaceState(null, '', url);
    setSelected(creature);
    setSearch('');
  };

  return (
    <div className={styles.tool}>
      <label className={styles.label} htmlFor={searchId}>
        Buscar criatura
      </label>
      <input
        id={searchId}
        className={styles.input}
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        placeholder="dragon, demon, hydra"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {results.length > 0 && (
        <ul className={styles.results}>
          {results.map((creature) => (
            <li key={creature.name}>
              <button
                className={styles.result}
                type="button"
                onClick={() => selectCreature(creature)}
              >
                <span>{creature.name}</span>
                <span>{formatNumber(creature.hitPoints)} HP</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {search.trim() !== '' && results.length === 0 && (
        <p className={styles.muted}>Nenhuma criatura encontrada.</p>
      )}

      {selected && <CreatureDetails creature={selected} />}

      <p className={styles.footnote}>
        Valores do Tibia Global, conferidos em{' '}
        {dataDate.split('-').reverse().join('/')}, com dados da{' '}
        <a href="https://tibia.fandom.com" rel="noopener">
          TibiaWiki
        </a>
        . Mostra criaturas com entrada no Bestiary.
      </p>
    </div>
  );
}
