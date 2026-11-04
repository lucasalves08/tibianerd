import { useEffect, useState } from 'react';
import {
  getIconPath,
  imbuementDataDate,
  imbuements,
  tierNames,
} from '../data/imbuements';
import {
  compareWithTokens,
  getImbuementCost,
  hasTokenOption,
  type ItemPrices,
} from '../domain/imbuementCost';
import styles from './ImbuementCalculator.module.css';

const STORAGE_KEY = 'tibianerd:imbuements';
const POWERFUL = 2;

interface SavedState {
  name: string;
  tierIndex: number;
  prices: ItemPrices;
  tokenPrice: number;
}

const initialState: SavedState = {
  name: 'Vampirism',
  tierIndex: POWERFUL,
  prices: {},
  tokenPrice: 0,
};

const formatNumber = (value: number) =>
  Math.round(value).toLocaleString('pt-BR');

function PriceField({
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

export default function ImbuementCalculator() {
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

  const imbuement =
    imbuements.find(({ name }) => name === state.name) ?? imbuements[0]!;
  const tier = imbuement.tiers[state.tierIndex]!;
  const cost = getImbuementCost(imbuement, state.tierIndex, state.prices);
  const comparison = compareWithTokens(
    imbuement,
    state.tierIndex,
    state.tokenPrice,
    cost.total,
  );

  return (
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="choice-title">
        <h2 id="choice-title" className={styles.panelTitle}>
          Escolha o imbuement
        </h2>
        <ul className={styles.grid}>
          {imbuements.map(({ name }) => (
            <li key={name}>
              <button
                className={styles.choice}
                type="button"
                aria-pressed={name === imbuement.name}
                onClick={() => update({ name })}
              >
                <img
                  src={getIconPath(name)}
                  width="64"
                  height="64"
                  loading="lazy"
                  alt=""
                />
                <span>{name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.panel} aria-labelledby="detail-title">
        <div className={styles.header}>
          <img src={getIconPath(imbuement.name)} width="64" height="64" alt="" />
          <div>
            <h2 id="detail-title" className={styles.panelTitle}>
              {tierNames[state.tierIndex]} {imbuement.name}
            </h2>
            <p className={styles.muted}>
              Efeito: {tier.effect}. Usado em: {imbuement.availableFor}.
            </p>
          </div>
        </div>

        <div className={styles.tiers} role="group" aria-label="Nível">
          {tierNames.map((name, index) => (
            <button
              key={name}
              className={styles.tier}
              type="button"
              aria-pressed={index === state.tierIndex}
              onClick={() => update({ tierIndex: index })}
            >
              {name}
            </button>
          ))}
        </div>

        <h3 className={styles.sectionTitle}>Preço no market (gold por item)</h3>
        <div className={styles.fields}>
          {tier.sources.map(({ item, amount }) => (
            <PriceField
              key={item}
              label={`${amount}× ${item}`}
              value={state.prices[item] ?? 0}
              onChange={(price) =>
                update({ prices: { ...state.prices, [item]: price } })
              }
            />
          ))}
          {hasTokenOption(imbuement) && (
            <PriceField
              label="Gold Token"
              value={state.tokenPrice}
              onChange={(tokenPrice) => update({ tokenPrice })}
            />
          )}
        </div>

        <dl className={styles.stats} aria-live="polite">
          <div>
            <dt>Taxa do santuário</dt>
            <dd>{formatNumber(cost.shrineFee)}</dd>
          </div>
          {cost.total !== undefined && (
            <>
              <div>
                <dt>Total com market</dt>
                <dd>{formatNumber(cost.total)}</dd>
              </div>
              <div>
                <dt>Por hora</dt>
                <dd>{formatNumber(cost.perHour ?? 0)}</dd>
              </div>
            </>
          )}
          {comparison && (
            <div>
              <dt>Total com {comparison.tokens} Gold Tokens</dt>
              <dd>{formatNumber(comparison.total)}</dd>
            </div>
          )}
        </dl>

        {cost.missingItems.length > 0 && (
          <p className={styles.notice}>
            Falta o preço de: {cost.missingItems.join(', ')}.
          </p>
        )}

        {comparison?.savings !== undefined && (
          <p className={styles.notice}>
            {comparison.savings > 0
              ? `Gold Tokens saem ${formatNumber(comparison.savings)} gold mais baratos.`
              : `O market sai ${formatNumber(-comparison.savings)} gold mais barato.`}
          </p>
        )}

        <p className={styles.footnote}>
          Cada imbuement dura 20 horas de uso. Valores do Tibia Global,
          conferidos em {imbuementDataDate.split('-').reverse().join('/')}, com
          dados da{' '}
          <a href="https://tibia.fandom.com/wiki/Imbuing" rel="noopener">
            TibiaWiki
          </a>
          .
          {hasTokenOption(imbuement) &&
            ' A troca por Gold Tokens com a Yana vem de relatos da comunidade: confira no jogo.'}
        </p>
      </section>
    </div>
  );
}
