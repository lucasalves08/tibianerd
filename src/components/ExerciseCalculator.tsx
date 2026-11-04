import { useEffect, useId, useState } from 'react';
import { tibiaGlobal } from '../data/exerciseWeapons';
import {
  calculateTraining,
  type TrainingProblem,
} from '../domain/exerciseCalculator';
import styles from './ExerciseCalculator.module.css';

const STORAGE_KEY = 'tibianerd:exercise';
const LOYALTY_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;

const server = tibiaGlobal;
const vocations = [...new Set(server.pairs.map(({ vocation }) => vocation))];

interface SavedState {
  vocation: string;
  pairId: string;
  currentLevel: string;
  percentLeft: string;
  targetLevel: string;
  loyaltyPercent: number;
  privateDummy: boolean;
  doubleEvent: boolean;
}

const firstPair = server.pairs[0]!;

const initialState: SavedState = {
  vocation: firstPair.vocation,
  pairId: firstPair.id,
  currentLevel: '',
  percentLeft: '100',
  targetLevel: '',
  loyaltyPercent: 0,
  privateDummy: false,
  doubleEvent: false,
};

const formatNumber = (value: number) => value.toLocaleString('pt-BR');

const parseNumber = (value: string) =>
  value.trim() === '' ? null : Number(value);

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.ceil(totalSeconds / SECONDS_PER_MINUTE);
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  return [
    days > 0 && `${formatNumber(days)} d`,
    hours > 0 && `${hours} h`,
    minutes > 0 && `${minutes} min`,
  ]
    .filter(Boolean)
    .join(' ');
}

function NumberField({
  label,
  value,
  problem,
  onChange,
  step = '1',
}: {
  label: string;
  value: string;
  problem?: TrainingProblem;
  onChange: (value: string) => void;
  step?: string;
}) {
  const errorId = useId();
  const [isTouched, setIsTouched] = useState(false);
  const visibleProblem = isTouched ? problem : undefined;

  // Waits for the player to leave the field, so a half typed value is no error.
  return (
    <label className={styles.field}>
      {label}
      <input
        className={styles.input}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        aria-invalid={visibleProblem ? true : undefined}
        aria-describedby={visibleProblem ? errorId : undefined}
        onBlur={() => setIsTouched(true)}
        onChange={(event) => onChange(event.target.value)}
      />
      {visibleProblem && (
        <span id={errorId} className={styles.error}>
          {visibleProblem.message}
        </span>
      )}
    </label>
  );
}

export default function ExerciseCalculator() {
  const [state, setState] = useState(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

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

  const pairs = server.pairs.filter(
    ({ vocation }) => vocation === state.vocation,
  );

  const changeVocation = (vocation: string) => {
    const current = server.pairs.find(({ id }) => id === state.pairId);
    const options = server.pairs.filter((pair) => pair.vocation === vocation);
    const match = options.find(({ skill }) => skill === current?.skill);

    update({ vocation, pairId: (match ?? options[0]!).id });
  };

  const { problems, result } = calculateTraining(
    {
      pairId: state.pairId,
      currentLevel: parseNumber(state.currentLevel),
      percentLeft: parseNumber(state.percentLeft),
      targetLevel: parseNumber(state.targetLevel),
    },
    {
      privateDummy: state.privateDummy,
      doubleEvent: state.doubleEvent,
      loyaltyPercent: state.loyaltyPercent,
    },
    server,
  );

  const getProblem = (field: TrainingProblem['field']) =>
    problems.find((problem) => problem.field === field);

  return (
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="goal-title">
        <h2 id="goal-title" className={styles.panelTitle}>
          Seu treino
        </h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            Vocação
            <select
              className={styles.input}
              value={state.vocation}
              onChange={(event) => changeVocation(event.target.value)}
            >
              {vocations.map((vocation) => (
                <option key={vocation}>{vocation}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Skill
            <select
              className={styles.input}
              value={state.pairId}
              onChange={(event) => update({ pairId: event.target.value })}
            >
              {pairs.map(({ id, skill }) => (
                <option key={id} value={id}>
                  {skill}
                </option>
              ))}
            </select>
          </label>
          <NumberField
            label="Skill atual"
            value={state.currentLevel}
            problem={getProblem('currentLevel')}
            onChange={(currentLevel) => update({ currentLevel })}
          />
          <NumberField
            label="Skill desejada"
            value={state.targetLevel}
            problem={getProblem('targetLevel')}
            onChange={(targetLevel) => update({ targetLevel })}
          />
          <NumberField
            label="% restante"
            step="any"
            value={state.percentLeft}
            problem={getProblem('percentLeft')}
            onChange={(percentLeft) => update({ percentLeft })}
          />
          <label className={styles.field}>
            Loyalty
            <select
              className={styles.input}
              value={state.loyaltyPercent}
              onChange={(event) =>
                update({ loyaltyPercent: Number(event.target.value) })
              }
            >
              {LOYALTY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}%
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={state.privateDummy}
            onChange={(event) =>
              update({ privateDummy: event.target.checked })
            }
          />
          Dummy privado
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={state.doubleEvent}
            onChange={(event) => update({ doubleEvent: event.target.checked })}
          />
          Evento de skill em dobro
        </label>
      </section>

      <section
        className={styles.panel}
        aria-labelledby="result-title"
        aria-live="polite"
      >
        <h2 id="result-title" className={styles.panelTitle}>
          Resultado
        </h2>

        {result ? (
          <>
            <dl className={styles.stats}>
              <div>
                <dt>Cargas</dt>
                <dd>{formatNumber(result.charges)}</dd>
              </div>
              <div>
                <dt>Tempo de uso</dt>
                <dd>{formatDuration(result.seconds)}</dd>
              </div>
            </dl>

            <div className={styles.mix}>
              <h3 className={styles.sectionTitle}>Compra sugerida</h3>
              <ul className={styles.mixItems}>
                {result.mix.items.map(({ weapon, quantity }) => (
                  <li key={weapon.id}>
                    <strong>{formatNumber(quantity)}×</strong> {weapon.name}
                  </li>
                ))}
              </ul>
              <p className={styles.muted}>
                {formatNumber(result.mix.gold)} gold ou{' '}
                {formatNumber(result.mix.coins)} Tibia Coins
              </p>
            </div>

            <h3 className={styles.sectionTitle}>Usando só uma arma</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Arma</th>
                    <th scope="col">Quantidade</th>
                    <th scope="col">Gold</th>
                    <th scope="col">Coins</th>
                  </tr>
                </thead>
                <tbody>
                  {result.options.map(({ weapon, quantity, gold, coins }) => (
                    <tr key={weapon.id}>
                      <th scope="row">{weapon.name}</th>
                      <td>{formatNumber(quantity)}</td>
                      <td>{formatNumber(gold)}</td>
                      <td>{formatNumber(coins)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className={styles.empty}>
            Preencha a skill atual e a desejada para ver o resultado.
          </p>
        )}

        <p className={styles.footnote}>
          Use as skills como aparecem no jogo, com loyalty. O efeito do loyalty
          é uma estimativa. Cada carga dura 2 segundos. Valores do{' '}
          {server.name}, conferidos em{' '}
          {server.reviewedAt.split('-').reverse().join('/')}. Fontes:{' '}
          {server.sources.map(({ name, url }, index) => (
            <span key={url}>
              {index > 0 && ' e '}
              <a href={url} rel="noopener">
                {name}
              </a>
            </span>
          ))}
          .
        </p>
      </section>
    </div>
  );
}
