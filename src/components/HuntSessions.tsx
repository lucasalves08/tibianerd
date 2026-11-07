import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Character } from '../domain/characters';
import { getRareDrops, type DropRarity, type LootRarity } from '../domain/rareDrops';
import {
  formations,
  formatCompact,
  formatDuration,
  getHuntAverages,
  getKillCount,
  getMinutesPerLevel,
  getSessionKind,
  getSessionRates,
  MAX_HUNT_NAME_LENGTH,
  MAX_SESSION_TEXT_LENGTH,
  parseHuntSession,
  xpModes,
  type FormationId,
  type HuntSession,
  type SavedHuntSession,
  type SessionKind,
  type XpMode,
} from '../domain/huntSession';
import { formatHuntStart } from '../domain/partyHunt';
import CreatureIcon from './CreatureIcon';
import Segmented from './Segmented';
import finder from './PartyFinder.module.css';
import styles from './HuntSessions.module.css';

const SESSIONS_URL = '/api/hunt-sessions';
const XP_MODE_KEY = 'tibianerd:xp-mode';
const MIN_ESTIMATE_HOURS = 1;
const MAX_ESTIMATE_HOURS = 6;
const DEFAULT_ESTIMATE_HOURS = 3;
const SAVE_ERROR = 'Não conseguimos salvar agora. Tente de novo.';

const saveErrors: Record<string, string> = {
  duplicate: 'Essa sessão já está salva.',
  full: 'Você chegou ao limite de sessões salvas. Remova alguma para salvar outra.',
  invalid: 'Confira a sessão e o nome da hunt.',
};

const kindLabels: Record<SessionKind, string> = {
  real: 'Média real',
  projection: 'Projeção',
  short: 'Sessão curta',
};

const kindNotes: Record<SessionKind, string> = {
  real: '',
  projection:
    'Valores por hora projetados a partir desta sessão. Um drop raro ou o começo da hunt podem mudar bastante o resultado.',
  short: 'Sessão curta demais para projetar. Cace pelo menos 10 minutos.',
};

const xpNames: Record<XpMode, string> = { raw: 'Raw XP', xp: 'XP' };

const rarityNames: Record<DropRarity, string> = {
  rare: 'raro',
  'very-rare': 'muito raro',
};

const WIKI_URL = 'https://tibia.fandom.com';

const formatPercent = (value: number) => `${Math.round(value)}%`;

const formatMinutes = (minutes: number) =>
  minutes < 120 ? `${minutes} min` : formatDuration(minutes * 60);

const readXpMode = (): XpMode => {
  try {
    return localStorage.getItem(XP_MODE_KEY) === 'xp' ? 'xp' : 'raw';
  } catch {
    return 'raw';
  }
};

const saveXpMode = (mode: XpMode) => {
  try {
    localStorage.setItem(XP_MODE_KEY, mode);
  } catch {
    // The choice just lasts until the page closes.
  }
};

function Tile({
  label,
  hourly,
  total,
  isShort,
  isLoss = false,
}: {
  label: string;
  hourly: string;
  total: string;
  isShort: boolean;
  isLoss?: boolean;
}) {
  return (
    <div className={styles.tile}>
      <p className={finder.muted}>
        {label} {isShort ? 'na sessão' : 'por hora'}
      </p>
      <p className={styles.value} data-loss={isLoss || undefined}>
        {isShort ? total : hourly}
      </p>
      {!isShort && <p className={finder.muted}>{total} nesta sessão</p>}
    </div>
  );
}

function Monsters({ session }: { session: HuntSession }) {
  const total = getKillCount(session);

  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>Monstros mortos</h3>
      <ul className={styles.monsters}>
        {session.monsters.map(({ name, count }) => {
          const share = (count / total) * 100;

          return (
            <li key={name} className={styles.monster}>
              <CreatureIcon name={name} size={32} />
              <div className={styles.monsterText}>
                <p className={styles.monsterName}>
                  <span>{name}</span>
                  <span className={finder.muted}>
                    {count.toLocaleString('pt-BR')} · {formatPercent(share)}
                  </span>
                </p>
                <span className={styles.track}>
                  <span className={styles.bar} style={{ width: `${share}%` }} />
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Estimates({
  session,
  level,
  xpMode,
}: {
  session: HuntSession;
  level: number | null;
  xpMode: XpMode;
}) {
  const [hours, setHours] = useState(DEFAULT_ESTIMATE_HOURS);
  const rates = getSessionRates(session);
  const xpRate = xpMode === 'raw' ? rates.rawXp : rates.xp;
  const minutes = level ? getMinutesPerLevel(level, rates.xp) : null;

  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>Estimativas neste ritmo</h3>
      <label className={styles.slider}>
        Se caçar
        <input
          type="range"
          min={MIN_ESTIMATE_HOURS}
          max={MAX_ESTIMATE_HOURS}
          value={hours}
          onChange={(event) => setHours(Number(event.target.value))}
        />
        <output>{hours}h</output>
      </label>
      <p>
        {formatCompact(xpRate * hours)} de {xpNames[xpMode]} e{' '}
        {formatCompact(rates.balance * hours)} de lucro
      </p>
      {minutes !== null && (
        <p>
          Um nível no {level!.toLocaleString('pt-BR')}: cerca de{' '}
          {formatMinutes(minutes)}
        </p>
      )}
      <p className={finder.muted}>Stamina e bônus podem mudar o ritmo.</p>
    </section>
  );
}

function RareDrops({
  session,
  loot,
}: {
  session: HuntSession;
  loot: LootRarity | null;
}) {
  const drops = useMemo(
    () => (loot ? getRareDrops(session, loot) : []),
    [session, loot],
  );

  if (drops.length === 0) {
    return null;
  }

  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>Drops raros</h3>
      <ul className={styles.drops}>
        {drops.map(({ name, count, rarity }) => (
          <li key={name} className={styles.drop} data-rarity={rarity}>
            <span>
              {count.toLocaleString('pt-BR')}x {name}
            </span>
            <span className={styles.rarity}>{rarityNames[rarity]}</span>
          </li>
        ))}
      </ul>
      <p className={finder.muted}>
        Raridade segundo o{' '}
        <a href={WIKI_URL} target="_blank" rel="noreferrer">
          TibiaWiki
        </a>
        , que segue o Tibia oficial.
      </p>
    </section>
  );
}

function SessionResult({
  session,
  level,
  xpMode,
  loot,
  heading,
}: {
  session: HuntSession;
  level: number | null;
  xpMode: XpMode;
  loot: LootRarity | null;
  heading?: ReactNode;
}) {
  const kind = getSessionKind(session.seconds);
  const isShort = kind === 'short';
  const rates = getSessionRates(session);
  const kills = getKillCount(session);
  const multiplier = session.rawXp > 0 ? session.xp / session.rawXp : 0;
  const xpValue = xpMode === 'raw' ? session.rawXp : session.xp;
  const xpRate = xpMode === 'raw' ? rates.rawXp : rates.xp;

  return (
    <div className={styles.result}>
      {heading}

      {kindNotes[kind] && <p className={finder.muted}>{kindNotes[kind]}</p>}

      <div className={styles.tiles}>
        <Tile
          label={xpNames[xpMode]}
          hourly={formatCompact(xpRate)}
          total={formatCompact(xpValue)}
          isShort={isShort}
        />
        <Tile
          label="Lucro"
          hourly={formatCompact(rates.balance)}
          total={formatCompact(session.balance)}
          isShort={isShort}
          isLoss={session.balance < 0}
        />
      </div>

      <dl className={styles.details}>
        <div>
          <dt>{isShort ? 'Monstros' : 'Monstros/h'}</dt>
          <dd>{formatCompact(isShort ? kills : rates.kills)}</dd>
        </div>
        <div>
          <dt>Loot</dt>
          <dd>{formatCompact(session.loot)}</dd>
        </div>
        <div>
          <dt>Supplies</dt>
          <dd>{formatCompact(session.supplies)}</dd>
        </div>
        <div>
          <dt>{isShort ? 'Dano' : 'Dano/h'}</dt>
          <dd>{formatCompact(isShort ? session.damage : rates.damage)}</dd>
        </div>
        <div>
          <dt>{isShort ? 'Cura' : 'Cura/h'}</dt>
          <dd>{formatCompact(isShort ? session.healing : rates.healing)}</dd>
        </div>
        {multiplier > 0 && (
          <div>
            <dt>Multiplicador de XP</dt>
            <dd>{multiplier.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x</dd>
          </div>
        )}
      </dl>

      <div className={styles.columns}>
        {session.monsters.length > 0 && <Monsters session={session} />}
        {!isShort && (
          <Estimates session={session} level={level} xpMode={xpMode} />
        )}
      </div>

      <RareDrops session={session} loot={loot} />

      {session.items.length > 0 && (
        <details className={styles.items}>
          <summary>Todos os itens ({session.items.length})</summary>
          <ul className={styles.itemList}>
            {session.items.map(({ name: item, count }) => (
              <li key={item}>
                <span>{item}</span>
                <span className={finder.muted}>
                  {count.toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SaveForm({
  text,
  characters,
  characterId,
  huntNames,
  onCharacter,
  onSaved,
}: {
  text: string;
  characters: Character[];
  characterId: string;
  huntNames: string[];
  onCharacter: (id: string) => void;
  onSaved: () => Promise<void>;
}) {
  const formationName = useId();
  const listId = useId();
  const [huntName, setHuntName] = useState('');
  const [formation, setFormation] = useState<FormationId>('solo');
  const [error, setError] = useState('');

  const save = async () => {
    setError('');

    try {
      const response = await fetch(SESSIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, characterId, huntName, formation }),
      });

      if (response.ok) {
        await onSaved();
        return;
      }

      const data = (await response.json()) as { error?: string };

      setError(saveErrors[data.error ?? ''] ?? SAVE_ERROR);
    } catch {
      setError(SAVE_ERROR);
    }
  };

  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>Salvar esta sessão</h3>
      <div className={styles.saveFields}>
        {characters.length > 1 ? (
          <label className={finder.field}>
            Personagem
            <select
              className={finder.input}
              value={characterId}
              onChange={(event) => onCharacter(event.target.value)}
            >
              {characters.map(({ id, name, level }) => (
                <option key={id} value={id}>
                  {name} ({level.toLocaleString('pt-BR')})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className={styles.character}>
            <span className={finder.muted}>Personagem</span>
            <strong>{characters[0]?.name}</strong>
          </p>
        )}
        <label className={finder.field}>
          Nome da hunt
          <input
            className={finder.input}
            list={listId}
            maxLength={MAX_HUNT_NAME_LENGTH}
            placeholder="Ex.: Falcon Bastion"
            value={huntName}
            onChange={(event) => setHuntName(event.target.value)}
          />
          <datalist id={listId}>
            {huntNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <Segmented
          label="Formação"
          name={formationName}
          options={formations}
          value={formation}
          onChange={setFormation}
        />
      </div>
      <button
        className={finder.button}
        type="button"
        disabled={!huntName.trim() || !characterId}
        onClick={() => void save()}
      >
        Salvar sessão
      </button>
      <p className={finder.muted}>Só você vê as sessões salvas.</p>
      {error && (
        <p className={finder.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function SavedSessions({
  saved,
  openId,
  xpMode,
  loot,
  onRemove,
}: {
  saved: SavedHuntSession[];
  openId: string;
  xpMode: XpMode;
  loot: LootRarity | null;
  onRemove: (id: string) => void;
}) {
  // One session is its own average, so only repeated hunts get one.
  const averages = useMemo(
    () => getHuntAverages(saved).filter(({ sessions }) => sessions > 1),
    [saved],
  );

  return (
    <>
      {averages.length > 0 && (
        <section className={finder.panel} aria-labelledby="averages-title">
          <h2 id="averages-title" className={finder.panelTitle}>
            Média por hunt
          </h2>
          <ul className={styles.averages}>
            {averages.map((average) => (
              <li key={average.key} className={styles.average}>
                <div>
                  <strong>{average.huntName}</strong>
                  <p className={finder.muted}>
                    {average.characterName} · {average.sessions} sessões ·{' '}
                    {formatDuration(average.seconds)}
                  </p>
                </div>
                <p className={styles.averageRates}>
                  <span>
                    {formatCompact(
                      xpMode === 'raw' ? average.rawXpPerHour : average.xpPerHour,
                    )}{' '}
                    {xpNames[xpMode]}/h
                  </span>
                  <span>{formatCompact(average.balancePerHour)} lucro/h</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={finder.panel} aria-labelledby="sessions-title">
        <h2 id="sessions-title" className={finder.panelTitle}>
          Suas sessões
        </h2>
        <ul className={styles.sessions}>
          {saved.map(({ id, huntName, characterName, level, formation, session }) => {
            const rates = getSessionRates(session);
            const kind = getSessionKind(session.seconds);
            const details = [
              characterName,
              formations.find((item) => item.id === formation)?.name,
              formatDuration(session.seconds),
              session.start && formatHuntStart(session.start),
              kind !== 'real' && kindLabels[kind],
            ].filter(Boolean);

            return (
              <li key={id}>
                <details className={styles.session} open={id === openId}>
                  <summary>
                    <span className={styles.sessionName}>
                      <strong>{huntName}</strong>
                      <span className={finder.muted}>{details.join(' · ')}</span>
                    </span>
                    {kind !== 'short' && (
                      <span className={styles.summaryRates}>
                        <span>
                          {formatCompact(xpMode === 'raw' ? rates.rawXp : rates.xp)}{' '}
                          {xpNames[xpMode]}/h
                        </span>
                        <span data-loss={rates.balance < 0 || undefined}>
                          {formatCompact(rates.balance)} lucro/h
                        </span>
                      </span>
                    )}
                  </summary>
                  <SessionResult
                    session={session}
                    level={level}
                    xpMode={xpMode}
                    loot={loot}
                  />
                  <button
                    className={finder.textButton}
                    type="button"
                    onClick={() => onRemove(id)}
                  >
                    Remover sessão
                  </button>
                </details>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

export default function HuntSessions() {
  const [text, setText] = useState('');
  const [xpMode, setXpMode] = useState<XpMode>('raw');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterId, setCharacterId] = useState('');
  const [saved, setSaved] = useState<SavedHuntSession[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [openId, setOpenId] = useState('');
  const [loot, setLoot] = useState<LootRarity | null>(null);
  const xpName = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const wantsBoxFocus = useRef(false);

  const session = useMemo(() => parseHuntSession(text), [text]);
  const huntNames = useMemo(
    () => [...new Set(saved.map(({ huntName }) => huntName))],
    [saved],
  );

  const loadSaved = async () => {
    const response = await fetch(SESSIONS_URL);

    if (!response.ok) {
      return [];
    }

    const list = (await response.json()) as SavedHuntSession[];

    setSaved(list);

    return list;
  };

  useEffect(() => {
    setXpMode(readXpMode());

    const loadCharacters = async () => {
      const response = await fetch('/api/characters');

      if (response.ok) {
        const list = (await response.json()) as Character[];

        setIsSignedIn(true);
        setCharacters(list);
        setCharacterId(list[0]?.id ?? '');
      }
    };

    Promise.all([loadCharacters(), loadSaved()]).catch(() =>
      setError('Não conseguimos carregar suas sessões.'),
    );
  }, []);

  // The rarity data is large, so it only loads once there is loot to read.
  useEffect(() => {
    if (loot || (!session && saved.length === 0)) {
      return;
    }

    import('../data/lootRarity')
      .then((data) => setLoot(data.lootRarity))
      .catch(() => {
        // Without the data the rare drops just stay hidden.
      });
  }, [loot, session, saved.length]);

  // The box leaves the page once it is read, and focus must not leave with it.
  useEffect(() => {
    if (session) {
      titleRef.current?.focus();
    } else if (wantsBoxFocus.current) {
      wantsBoxFocus.current = false;
      boxRef.current?.focus();
    }
  }, [session]);

  const pasteAnother = () => {
    wantsBoxFocus.current = true;
    setText('');
    setIsSaving(false);
    setNotice('');
  };

  const finishSaving = async () => {
    const list = await loadSaved();

    setText('');
    setIsSaving(false);
    setNotice('Sessão salva.');
    setOpenId(list[0]?.id ?? '');
  };

  const changeXpMode = (mode: XpMode) => {
    setXpMode(mode);
    saveXpMode(mode);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remover esta sessão?')) {
      return;
    }

    try {
      const response = await fetch(`${SESSIONS_URL}/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      await loadSaved();
    } catch {
      setError('Não conseguimos remover agora. Tente de novo.');
    }
  };

  const level = characters.find(({ id }) => id === characterId)?.level ?? null;
  const canSave = isSignedIn && characters.length > 0;

  return (
    <div className={styles.page}>
      {(session || saved.length > 0) && (
        <div className={styles.xpSwitch}>
          <Segmented
            label="Tipo de XP"
            name={xpName}
            options={xpModes}
            value={xpMode}
            onChange={changeXpMode}
          />
        </div>
      )}

      <section
        className={finder.panel}
        aria-labelledby={session ? undefined : 'paste-title'}
        aria-label={session ? 'Sessão colada' : undefined}
      >
        <div className={styles.notice} role="status">
          {notice && <p>{notice}</p>}
        </div>

        {!session && (
          <>
            <h2 id="paste-title" className={finder.panelTitle}>
              Colar sessão
            </h2>
            <label className={finder.field}>
              Hunt Analyser
              <textarea
                ref={boxRef}
                className={finder.textarea}
                rows={5}
                maxLength={MAX_SESSION_TEXT_LENGTH}
                placeholder="No jogo, copie a sessão do Hunt Analyser e cole aqui"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setNotice('');
                }}
              />
            </label>
            {text.trim() && (
              <p className={finder.error} role="alert">
                Não reconhecemos esse texto. Copie a sessão inteira do Hunt
                Analyser no jogo e cole aqui.
              </p>
            )}
          </>
        )}

        {session && (
          <>
            <SessionResult
              session={session}
              level={level}
              xpMode={xpMode}
              loot={loot}
              heading={
                <header className={styles.resultHeader}>
                  <div className={styles.resultHeading}>
                    <h2
                      ref={titleRef}
                      className={styles.resultTitle}
                      tabIndex={-1}
                    >
                      Sessão de {formatDuration(session.seconds)}
                    </h2>
                    <p className={finder.muted}>
                      {session.start && `${formatHuntStart(session.start)} · `}
                      {kindLabels[getSessionKind(session.seconds)]}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    {canSave && (
                      <button
                        className={finder.button}
                        type="button"
                        aria-expanded={isSaving}
                        onClick={() => setIsSaving(!isSaving)}
                      >
                        Salvar
                      </button>
                    )}
                    <button
                      className={finder.textButton}
                      type="button"
                      onClick={pasteAnother}
                    >
                      Colar outra
                    </button>
                  </div>
                </header>
              }
            />
            {isSaving && (
              <SaveForm
                text={text}
                characters={characters}
                characterId={characterId}
                huntNames={huntNames}
                onCharacter={setCharacterId}
                onSaved={finishSaving}
              />
            )}
            {isSignedIn && characters.length === 0 && (
              <p className={finder.muted}>
                <a href="/account/" data-astro-prefetch="false">
                  Cadastre um personagem
                </a>{' '}
                para salvar suas sessões.
              </p>
            )}
            {!isSignedIn && (
              <p className={finder.muted}>
                <a href="/account/" data-astro-prefetch="false">
                  Entre com o Discord
                </a>{' '}
                para salvar suas sessões.
              </p>
            )}
          </>
        )}
      </section>

      {error && (
        <p className={finder.error} role="alert">
          {error}
        </p>
      )}

      {saved.length > 0 && (
        <SavedSessions
          saved={saved}
          openId={openId}
          xpMode={xpMode}
          loot={loot}
          onRemove={(id) => void remove(id)}
        />
      )}
    </div>
  );
}
