import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  charms,
  getCharmIconPath,
  tierChances,
  type Tier,
} from '../data/charms';
import { creatures, dataDate, type Creature } from '../data/creatures';
import type { Hunt } from '../data/hunts';
import {
  getBaseStats,
  vocations,
  type VocationId,
} from '../domain/characterStats';
import {
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
const MAX_SEARCH_RESULTS = 30;
const tiers: Tier[] = [1, 2, 3];

interface SavedState {
  vocation: VocationId | '';
  level: number;
  hitPoints: number;
  mana: number;
  charmTiers: Record<string, Tier | null>;
  hunt: { name: string; kills: number }[];
}

const initialState: SavedState = {
  vocation: '',
  level: 0,
  hitPoints: 0,
  mana: 0,
  charmTiers: Object.fromEntries(charms.map((charm) => [charm.id, 2])),
  hunt: [],
};

const LOG_EXAMPLE = `Session: 01:00h
Killed Monsters:
  251x darklight striker
  160x walking pillar`;

const formatNumber = (value: number) =>
  Math.round(value).toLocaleString('pt-BR');

const formatChance = (tier: Tier) =>
  `${Math.round(tierChances[tier - 1] * 100)}%`;

const creaturesByName = new Map(
  creatures.map((creature) => [fold(creature.name), creature]),
);

const findCreature = (name: string): Creature | undefined =>
  creaturesByName.get(fold(name));

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

function SearchPicker<Item>({
  label,
  placeholder,
  items,
  getName,
  renderItem,
  onPick,
  autoFocus = false,
}: {
  label: string;
  placeholder: string;
  items: Item[];
  getName: (item: Item) => string;
  renderItem: (item: Item) => ReactNode;
  onPick: (item: Item) => void;
  autoFocus?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(autoFocus);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const term = fold(search.trim());

    return items
      .filter((item) => fold(getName(item)).includes(term))
      .slice(0, MAX_SEARCH_RESULTS);
  }, [search, items, getName]);

  return (
    <div className={styles.search} ref={rootRef}>
      <label className={styles.field}>
        {label}
        <input
          className={styles.input}
          type="search"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={search}
          aria-expanded={isOpen}
          onFocus={() => {
            setIsOpen(true);

            // Keeps the list above the phone keyboard.
            if (window.matchMedia('(pointer: coarse)').matches) {
              rootRef.current?.scrollIntoView({ block: 'start' });
            }
          }}
          onClick={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onChange={(event) => {
            setSearch(event.target.value);
            setIsOpen(true);
          }}
        />
      </label>

      {isOpen && results.length > 0 && (
        <ul className={styles.results}>
          {results.map((item) => (
            <li key={getName(item)}>
              <button
                className={styles.result}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onPick(item);
                  setSearch('');
                  setIsOpen(false);
                }}
              >
                {renderItem(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const getCreatureName = ({ name }: Creature) => name;
const getPlaceName = ({ name }: Hunt) => name;

export default function CharmOptimizer() {
  const [state, setState] = useState(initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [log, setLog] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const [isChoosingPlace, setIsChoosingPlace] = useState(false);
  const [huntPlaces, setHuntPlaces] = useState<Hunt[]>([]);
  const [chosenPlace, setChosenPlace] = useState<{
    name: string;
    hasSpawns: boolean;
  } | null>(null);
  const [unknownNames, setUnknownNames] = useState<string[]>([]);
  const [isCharmsOpen, setIsCharmsOpen] = useState(false);

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

  const setCharacter = (changes: Pick<SavedState, 'vocation' | 'level'>) =>
    update({
      ...changes,
      ...getBaseStats(changes.vocation, changes.level),
    });

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

  const availableCreatures = useMemo(() => {
    const inHunt = new Set(state.hunt.map(({ name }) => name));

    return creatures.filter((creature) => !inHunt.has(creature.name));
  }, [state.hunt]);

  const addCreature = (creature: Creature) =>
    update({ hunt: [...state.hunt, { name: creature.name, kills: 1 }] });

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
    setChosenPlace(null);
    setLog('');
  };

  const togglePlaces = () => {
    setIsChoosingPlace(!isChoosingPlace);
    setIsPasting(false);

    // The list of places is heavy, so only those who open it pay for it.
    if (huntPlaces.length === 0) {
      void import('../data/hunts').then(({ hunts }) =>
        setHuntPlaces(
          hunts
            .filter(({ creatureNames }) => creatureNames.some(findCreature))
            .sort((first, second) => first.name.localeCompare(second.name)),
        ),
      );
    }
  };

  const applyPlace = (place: Hunt) => {
    const creaturesInPlace = new Map<string, number>();

    place.creatureNames.forEach((name, index) => {
      const creature = findCreature(name);

      if (creature) {
        creaturesInPlace.set(creature.name, place.creatureSpawns[index] ?? 0);
      }
    });

    setUnknownNames([]);
    update({
      hunt: [...creaturesInPlace].map(([name, spawns]) => ({
        name,
        kills: Math.max(spawns, 1),
      })),
    });
    setChosenPlace({
      name: place.name,
      hasSpawns: [...creaturesInPlace.values()].some((spawns) => spawns > 0),
    });
    setIsChoosingPlace(false);
  };

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <section className={styles.panel} aria-labelledby="character-title">
          <h2 id="character-title" className={styles.panelTitle}>
            Seu personagem
          </h2>
          <div className={styles.fields}>
            <label className={styles.field}>
              Vocação
              <select
                className={styles.input}
                value={state.vocation}
                onChange={(event) =>
                  setCharacter({
                    vocation: event.target.value as SavedState['vocation'],
                    level: state.level,
                  })
                }
              >
                <option value="">Escolha</option>
                {vocations.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <NumberField
              label="Nível"
              value={state.level}
              onChange={(level) =>
                setCharacter({ vocation: state.vocation, level })
              }
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
          {state.vocation && (
            <p className={styles.muted}>
              Vida e mana são os valores base do nível. Ajuste para incluir
              equipamentos e outros bônus.
            </p>
          )}
          {!(state.hitPoints && state.mana) && (
            <p className={styles.notice}>
              Sem vida e mana, não conseguimos calcular Overpower e Overflux.
            </p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="charms-title">
          <h2 id="charms-title" className={styles.panelTitle}>
            <span className={styles.charmsLabel}>Seus charms</span>
            <button
              className={styles.charmsToggle}
              type="button"
              aria-expanded={isCharmsOpen}
              aria-controls="charm-list"
              onClick={() => setIsCharmsOpen(!isCharmsOpen)}
            >
              Seus charms
              <span className={styles.charmsCount}>
                Ativos: {owned.length} de {charms.length}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M2 4 6 8 10 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </h2>
          <ul
            id="charm-list"
            className={styles.charmList}
            data-collapsed={!isCharmsOpen || undefined}
          >
            {charms.map((charm) => {
              const tier = state.charmTiers[charm.id] ?? null;

              return (
                <li
                  key={charm.id}
                  className={styles.charm}
                  data-off={tier === null || undefined}
                >
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
                        aria-label={`Tier ${option} de ${charm.name}: ${formatChance(
                          option,
                        )} de chance`}
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
          <div className={styles.panelActions}>
            <button
              className={styles.button}
              type="button"
              aria-expanded={isPasting}
              onClick={() => {
                setIsPasting(!isPasting);
                setIsChoosingPlace(false);
              }}
            >
              Hunt Analyzer
            </button>
            <button
              className={styles.button}
              type="button"
              aria-expanded={isChoosingPlace}
              onClick={togglePlaces}
            >
              Hunting place
            </button>
          </div>
        </div>

        {isChoosingPlace && (
          <SearchPicker
            label="Hunting place"
            placeholder="Digite o lugar ou veja a lista"
            items={huntPlaces}
            getName={getPlaceName}
            renderItem={({ name, city }) => (
              <>
                <span>{name}</span>
                <span className={styles.resultHitPoints}>{city}</span>
              </>
            )}
            onPick={applyPlace}
            autoFocus
          />
        )}

        {isPasting && (
          <div className={styles.paste}>
            <label className={styles.field}>
              Texto do Hunt Analyzer
              <textarea
                className={styles.input}
                rows={6}
                placeholder={LOG_EXAMPLE}
                value={log}
                onChange={(event) => setLog(event.target.value)}
              />
            </label>
            <button className={styles.button} type="button" onClick={applyLog}>
              Usar estas criaturas
            </button>
          </div>
        )}

        <SearchPicker
          label="Buscar criatura"
          placeholder="Digite o nome ou veja a lista"
          items={availableCreatures}
          getName={getCreatureName}
          renderItem={(creature) => (
            <>
              <span className={styles.resultName}>
                <CreatureIcon name={creature.name} size={32} />
                {creature.name}
              </span>
              <span className={styles.resultHitPoints}>
                {formatNumber(creature.hitPoints)} HP
              </span>
            </>
          )}
          onPick={addCreature}
        />

        {chosenPlace && hunt.length > 0 && (
          <p className={styles.notice}>
            {chosenPlace.name}:{' '}
            {chosenPlace.hasSpawns
              ? 'mortes estimadas pela quantidade de spawns de cada criatura.'
              : 'não temos a quantidade de spawns deste lugar. Ajuste as mortes.'}{' '}
            Com o Hunt Analyzer, o resultado fica mais preciso.
          </p>
        )}

        {unknownNames.length > 0 && (
          <p className={styles.notice}>
            Não encontrei no Bestiary: {unknownNames.join(', ')}.
          </p>
        )}

        {!isLoaded ? (
          <p className={styles.loading} role="status">
            Carregando sua caçada…
          </p>
        ) : hunt.length === 0 ? (
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
                      <div className={styles.creatureResistances}>
                        <CreatureResistances creature={creature} />
                      </div>
                    </div>
                  </div>

                  {assignment ? (
                    <div
                      className={styles.pick}
                      data-element={assignment.charm.element ?? assignment.charm.id}
                    >
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
                        {formatChance(assignment.tier)} de chance
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
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path
                        d="M2 2 10 10M10 2 2 10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {hunt.length > 0 && unused.length > 0 && (
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

        <p className={styles.footnote}>
          Considera a resistência, os HP e as mortes de cada criatura. Dano
          elemental é 5% dos HP da criatura, limitado a 2× o seu nível antes da
          resistência. Overpower causa 5% da sua vida e Overflux 2,5% da sua
          mana, ambos limitados a 8% do HP da criatura. Valores do Tibia Global,
          conferidos em{' '}
          {dataDate.split('-').reverse().join('/')}. Spawns estimados com dados
          do{' '}
          <a href="https://github.com/opentibiabr/canary" rel="noopener">
            Canary
          </a>
          .
        </p>
      </section>
    </div>
  );
}
