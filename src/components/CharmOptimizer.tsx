import { useEffect, useMemo, useState } from 'react';
import {
  charms,
  getCharmIconPath,
  tierChances,
  type Tier,
} from '../data/charms';
import { creatures, dataDate, type Creature } from '../data/creatures';
import {
  getExpectedDamagePerHit,
  optimizeCharms,
  type HuntCreature,
  type OwnedCharm,
} from '../domain/charmOptimizer';
import { parseHuntLog } from '../domain/parseHuntLog';
import { fold } from '../domain/fold';
import CreatureIcon from './CreatureIcon';
import CreatureResistances from './CreatureResistances';
import styles from './CharmOptimizer.module.css';

const STORAGE_KEY = 'tibianerd:charms';
const MAX_SEARCH_RESULTS = 60;
const tiers: Tier[] = [1, 2, 3];

interface SavedState {
  level: number;
  hitPoints: number;
  mana: number;
  charmTiers: Record<string, Tier | null>;
  hunt: { name: string; kills: number }[];
}

const initialState: SavedState = {
  level: 0,
  hitPoints: 0,
  mana: 0,
  charmTiers: Object.fromEntries(charms.map((charm) => [charm.id, 2])),
  hunt: [],
};

const formatNumber = (value: number) =>
  Math.round(value).toLocaleString('pt-BR');

const findCreature = (name: string): Creature | undefined =>
  creatures.find((creature) => fold(creature.name) === fold(name));

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.field}>
      {label}
      <input
        className={styles.input}
        type="number"
        inputMode="numeric"
        min="0"
        value={value || ''}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function CharmOptimizer() {
  const [state, setState] = useState(initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [log, setLog] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const [unknownNames, setUnknownNames] = useState<string[]>([]);

  // Browser storage can be missing or blocked, and the tool works without it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        setState({ ...initialState, ...JSON.parse(saved) });
      }
    } catch {
      setState(initialState);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Nothing to do: the current page keeps working.
    }
  }, [state, isLoaded]);

  const update = (changes: Partial<SavedState>) =>
    setState((current) => ({ ...current, ...changes }));

  const hunt: HuntCreature[] = state.hunt.flatMap(({ name, kills }) => {
    const creature = findCreature(name);

    return creature ? [{ creature, kills }] : [];
  });

  const owned: OwnedCharm[] = charms.flatMap((charm) => {
    const tier = state.charmTiers[charm.id];

    return tier ? [{ charm, tier }] : [];
  });

  const { assignments, unused } = useMemo(
    () => optimizeCharms(hunt, owned, state, charms.length),
    [state],
  );

  const searchResults = useMemo(() => {
    const term = fold(search.trim());
    const inHunt = new Set(state.hunt.map(({ name }) => name));

    return creatures
      .filter(
        (creature) =>
          fold(creature.name).includes(term) && !inHunt.has(creature.name),
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }, [search, state.hunt]);

  const addCreature = (creature: Creature) => {
    update({ hunt: [...state.hunt, { name: creature.name, kills: 1 }] });
    setSearch('');
    setIsSearchOpen(false);
  };

  const setKills = (name: string, kills: number) =>
    update({
      hunt: state.hunt.map((entry) =>
        entry.name === name ? { ...entry, kills } : entry,
      ),
    });

  const removeCreature = (name: string) =>
    update({ hunt: state.hunt.filter((entry) => entry.name !== name) });

  const setTier = (id: string, tier: Tier | null) =>
    update({ charmTiers: { ...state.charmTiers, [id]: tier } });

  const applyLog = () => {
    const parsed = parseHuntLog(log);
    const known = parsed.flatMap(({ name, kills }) => {
      const creature = findCreature(name);

      return creature ? [{ name: creature.name, kills }] : [];
    });

    setUnknownNames(
      parsed.filter(({ name }) => !findCreature(name)).map(({ name }) => name),
    );
    update({ hunt: known });
    setIsPasting(false);
    setLog('');
  };

  const needsCharacter =
    !state.level || !state.hitPoints || !state.mana;

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <section className={styles.panel} aria-labelledby="character-title">
          <h2 id="character-title" className={styles.panelTitle}>
            Seu personagem
          </h2>
          <div className={styles.fields}>
            <NumberField
              label="Nível"
              value={state.level}
              onChange={(level) => update({ level })}
            />
            <NumberField
              label="Vida máxima"
              value={state.hitPoints}
              onChange={(hitPoints) => update({ hitPoints })}
            />
            <NumberField
              label="Mana máxima"
              value={state.mana}
              onChange={(mana) => update({ mana })}
            />
          </div>
          {needsCharacter && (
            <p className={styles.hint}>
              O nível limita o dano dos charms em criaturas com muita vida.
              Overpower e Overflux dependem da vida e da mana.
            </p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="charms-title">
          <h2 id="charms-title" className={styles.panelTitle}>
            Seus charms
          </h2>
          <ul className={styles.charmList}>
            {charms.map((charm) => {
              const tier = state.charmTiers[charm.id] ?? null;

              return (
                <li key={charm.id} className={styles.charm}>
                  <label className={styles.charmName}>
                    <input
                      type="checkbox"
                      checked={tier !== null}
                      onChange={(event) =>
                        setTier(charm.id, event.target.checked ? 2 : null)
                      }
                    />
                    <img
                      className={styles.charmIcon}
                      src={getCharmIconPath(charm.id)}
                      width="32"
                      height="32"
                      alt=""
                    />
                    {charm.name}
                  </label>
                  <div
                    className={styles.tiers}
                    role="group"
                    aria-label={`Tier de ${charm.name}`}
                  >
                    {tiers.map((option) => (
                      <button
                        key={option}
                        className={styles.tier}
                        type="button"
                        disabled={tier === null}
                        aria-pressed={tier === option}
                        aria-label={`Tier ${option} de ${charm.name}: ${
                          tierChances[option - 1] * 100
                        }% de chance`}
                        onClick={() => setTier(charm.id, option)}
                      >
                        T{option}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="hunt-title">
        <div className={styles.panelHeader}>
          <h2 id="hunt-title" className={styles.panelTitle}>
            Criaturas da caçada
          </h2>
          <button
            className={styles.button}
            type="button"
            aria-expanded={isPasting}
            onClick={() => setIsPasting(!isPasting)}
          >
            Colar do Hunt Analyzer
          </button>
        </div>

        {isPasting && (
          <div className={styles.paste}>
            <label className={styles.field}>
              Texto do Hunt Analyzer
              <textarea
                className={styles.input}
                rows={6}
                value={log}
                onChange={(event) => setLog(event.target.value)}
              />
            </label>
            <button className={styles.button} type="button" onClick={applyLog}>
              Usar estas criaturas
            </button>
          </div>
        )}

        <div className={styles.search}>
          <label className={styles.field}>
            Buscar criatura
            <input
              className={styles.input}
              type="search"
              autoComplete="off"
              placeholder="Clique para ver a lista ou digite o nome"
              value={search}
              aria-expanded={isSearchOpen}
              onFocus={() => setIsSearchOpen(true)}
              onClick={() => setIsSearchOpen(true)}
              onBlur={() => setIsSearchOpen(false)}
              onChange={(event) => {
                setSearch(event.target.value);
                setIsSearchOpen(true);
              }}
            />
          </label>

          {isSearchOpen && searchResults.length > 0 && (
            <ul className={styles.results}>
              {searchResults.map((creature) => (
                <li key={creature.name}>
                  <button
                    className={styles.result}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addCreature(creature)}
                  >
                    <span className={styles.resultName}>
                      <CreatureIcon name={creature.name} size={32} />
                      {creature.name}
                    </span>
                    <span className={styles.resultHitPoints}>
                      {formatNumber(creature.hitPoints)} HP
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {unknownNames.length > 0 && (
          <p className={styles.notice}>
            Não encontrei no Bestiary: {unknownNames.join(', ')}.
          </p>
        )}

        {hunt.length === 0 ? (
          <p className={styles.empty}>
            Adicione as criaturas da sua caçada para ver o melhor charm de cada
            uma.
          </p>
        ) : (
          <ul className={styles.creatures}>
            {hunt.map(({ creature, kills }) => {
              const assignment = assignments.find(
                (item) => item.creature.name === creature.name,
              );

              return (
                <li key={creature.name} className={styles.creature}>
                  <div className={styles.creatureHeader}>
                    <div className={styles.creatureSide}>
                      <CreatureIcon name={creature.name} />
                      <label className={styles.kills}>
                        Mortes
                        <input
                          className={styles.input}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={kills || ''}
                          onChange={(event) =>
                            setKills(creature.name, Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.creatureInfo}>
                      <div className={styles.creatureTitle}>
                        <h3 className={styles.creatureName}>{creature.name}</h3>
                        <span className={styles.muted}>
                          {formatNumber(creature.hitPoints)} HP
                        </span>
                      </div>
                      <CreatureResistances creature={creature} />
                    </div>
                  </div>

                  {assignment ? (
                    <div className={styles.pick}>
                      <img
                        className={styles.pickIcon}
                        src={getCharmIconPath(assignment.charm.id)}
                        width="48"
                        height="48"
                        alt=""
                      />
                      <p className={styles.pickName}>
                        {assignment.charm.name} T{assignment.tier}
                      </p>
                      <p className={styles.pickDamage}>
                        {formatNumber(assignment.damagePerProc)}{' '}
                        <small>por ativação</small>
                      </p>
                      <p className={styles.pickDetail}>
                        {formatNumber(assignment.damagePerHit)} por golpe
                        {assignment.isLevelCapped && ' · limitado pelo nível'}
                      </p>
                    </div>
                  ) : (
                    <p className={styles.noPick}>Sem charm disponível</p>
                  )}

                  <button
                    className={styles.remove}
                    type="button"
                    aria-label={`Remover ${creature.name}`}
                    onClick={() => removeCreature(creature.name)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {hunt.length > 0 && (
          <div className={styles.summary}>
            <p>
              Dano médio dos charms por golpe:{' '}
              <strong>
                {formatNumber(getExpectedDamagePerHit(hunt, assignments))}
              </strong>
            </p>
            {unused.length > 0 && (
              <div className={styles.unused}>
                <span>Sem uso:</span>
                {unused.map(({ charm }) => (
                  <img
                    key={charm.id}
                    className={styles.charmIcon}
                    src={getCharmIconPath(charm.id)}
                    width="32"
                    height="32"
                    alt={charm.name}
                    title={charm.name}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <p className={styles.footnote}>
          Considera a resistência, os HP e as mortes de cada criatura. Dano
          elemental é 5% dos HP da criatura, limitado a 2× o seu nível antes da
          resistência. Valores do Tibia Global, conferidos em{' '}
          {dataDate.split('-').reverse().join('/')}.
        </p>
      </section>
    </div>
  );
}
