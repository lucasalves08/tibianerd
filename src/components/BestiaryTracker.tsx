import { useEffect, useMemo, useState } from 'react';
import {
  bestiaryDataDate,
  bestiaryEntries,
  creatureClasses,
  type BestiaryEntry,
} from '../data/bestiary';
import {
  getEntryProgress,
  summarizeBestiary,
  type KillCounts,
} from '../domain/bestiaryProgress';
import { fold } from '../domain/searchTools';
import CreatureIcon from './CreatureIcon';
import styles from './BestiaryTracker.module.css';

const STORAGE_KEY = 'tibianerd:bestiary';
const PAGE_SIZE = 40;

const formatNumber = (value: number) => value.toLocaleString('pt-BR');

function EntryRow({
  entry,
  kills,
  onChange,
}: {
  entry: BestiaryEntry;
  kills: number;
  onChange: (kills: number) => void;
}) {
  const { stage, killsLeft, charmPoints, isComplete } = getEntryProgress(
    entry,
    kills,
  );

  return (
    <li className={styles.entry} data-complete={isComplete || undefined}>
      <div>
        <h2 className={styles.name}>
          <CreatureIcon name={entry.name} size={32} />
          {entry.name}
        </h2>
        <p className={styles.muted}>
          {entry.creatureClass} · {entry.difficulty}
          {entry.isVeryRare && ' · Very Rare'} · {charmPoints} pontos
        </p>
        <p className={styles.status}>
          {isComplete
            ? 'Completo'
            : `Etapa ${stage} de 3 · faltam ${formatNumber(killsLeft)} mortes`}
        </p>
      </div>
      <label className={styles.kills}>
        Mortes
        <input
          className={styles.input}
          type="number"
          inputMode="numeric"
          min="0"
          value={kills || ''}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
    </li>
  );
}

export default function BestiaryTracker() {
  const [killCounts, setKillCounts] = useState<KillCounts>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [creatureClass, setCreatureClass] = useState('');
  const [hideComplete, setHideComplete] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Browser storage can be missing or blocked, and the tool works without it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        setKillCounts(JSON.parse(saved));
      }
    } catch {
      setKillCounts({});
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(killCounts));
    } catch {
      // Nothing to do: the current page keeps working.
    }
  }, [killCounts, isLoaded]);

  const summary = useMemo(
    () => summarizeBestiary(bestiaryEntries, killCounts),
    [killCounts],
  );

  const term = fold(search.trim());
  const matches = bestiaryEntries.filter(
    (entry) =>
      fold(entry.name).includes(term) &&
      (!creatureClass || entry.creatureClass === creatureClass) &&
      (!hideComplete ||
        !getEntryProgress(entry, killCounts[entry.name] ?? 0).isComplete),
  );

  return (
    <div className={styles.tool}>
      <dl className={styles.stats}>
        <div>
          <dt>Charm Points ganhos</dt>
          <dd>{formatNumber(summary.earnedPoints)}</dd>
        </div>
        <div>
          <dt>Charm Points disponíveis</dt>
          <dd>{formatNumber(summary.availablePoints)}</dd>
        </div>
        <div>
          <dt>Entradas completas</dt>
          <dd>
            {formatNumber(summary.completed)} de {formatNumber(summary.total)}
          </dd>
        </div>
      </dl>

      <div className={styles.filters}>
        <label className={styles.field}>
          Buscar criatura
          <input
            className={styles.input}
            type="search"
            autoComplete="off"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          />
        </label>
        <label className={styles.field}>
          Classe
          <select
            className={styles.input}
            value={creatureClass}
            onChange={(event) => {
              setCreatureClass(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <option value="">Todas</option>
            {creatureClasses.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={hideComplete}
            onChange={(event) => setHideComplete(event.target.checked)}
          />
          Esconder completas
        </label>
      </div>

      <p className={styles.muted} role="status">
        {matches.length === 1
          ? '1 criatura encontrada'
          : `${formatNumber(matches.length)} criaturas encontradas`}
      </p>

      <ul className={styles.entries}>
        {matches.slice(0, visibleCount).map((entry) => (
          <EntryRow
            key={entry.name}
            entry={entry}
            kills={killCounts[entry.name] ?? 0}
            onChange={(kills) =>
              setKillCounts((current) => ({ ...current, [entry.name]: kills }))
            }
          />
        ))}
      </ul>

      {visibleCount < matches.length && (
        <button
          className={styles.more}
          type="button"
          onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)}
        >
          Mostrar mais
        </button>
      )}

      <p className={styles.footnote}>
        Seu progresso fica salvo neste navegador. Valores do Tibia Global,
        conferidos em {bestiaryDataDate.split('-').reverse().join('/')}, com
        dados da{' '}
        <a href="https://tibia.fandom.com/wiki/Cyclopedia" rel="noopener">
          TibiaWiki
        </a>
        .
      </p>
    </div>
  );
}
