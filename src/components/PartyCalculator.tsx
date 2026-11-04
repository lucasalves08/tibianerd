import { useEffect, useState } from 'react';
import { vocations, type VocationId } from '../domain/characterStats';
import {
  hasUnlistedBonus,
  PARTY_RULES_DATE,
  summarizeParty,
  type PartyMember,
} from '../domain/partyShare';
import styles from './PartyCalculator.module.css';

const STORAGE_KEY = 'tibianerd:party';
const MIN_ROWS = 2;

interface Row {
  vocation: VocationId | '';
  level: number;
}

const emptyRow: Row = { vocation: '', level: 0 };
const initialRows: Row[] = [emptyRow, emptyRow];

const formatLevel = (level: number) => level.toLocaleString('pt-BR');

const formatPercent = (share: number) =>
  `${(share * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

const isComplete = (row: Row): row is PartyMember =>
  row.vocation !== '' && row.level > 0;

export default function PartyCalculator() {
  const [rows, setRows] = useState(initialRows);
  const [isLoaded, setIsLoaded] = useState(false);

  // Browser storage can be missing or blocked, and the tool works without it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        setRows(JSON.parse(saved));
      }
    } catch {
      setRows(initialRows);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // Nothing to do: the current page keeps working.
    }
  }, [rows, isLoaded]);

  const updateRow = (index: number, changes: Partial<Row>) =>
    setRows(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...changes } : row,
      ),
    );

  const members = rows.filter(isComplete);
  const summary = summarizeParty(members);
  const memberVocations = members.map(({ vocation }) => vocation);

  return (
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="party-title">
        <h2 id="party-title" className={styles.panelTitle}>
          Sua party
        </h2>

        <ul className={styles.rows}>
          {rows.map((row, index) => (
            <li key={index} className={styles.row}>
              <label className={styles.field}>
                Vocação
                <select
                  className={styles.input}
                  value={row.vocation}
                  onChange={(event) =>
                    updateRow(index, {
                      vocation: event.target.value as Row['vocation'],
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
              <label className={styles.field}>
                Nível
                <input
                  className={styles.input}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={row.level || ''}
                  onChange={(event) =>
                    updateRow(index, { level: Number(event.target.value) })
                  }
                />
              </label>
              {rows.length > MIN_ROWS && (
                <button
                  className={styles.remove}
                  type="button"
                  aria-label={`Remover membro ${index + 1}`}
                  onClick={() =>
                    setRows(rows.filter((_, rowIndex) => rowIndex !== index))
                  }
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
              )}
            </li>
          ))}
        </ul>

        <button
          className={styles.button}
          type="button"
          onClick={() => setRows([...rows, emptyRow])}
        >
          Adicionar membro
        </button>
      </section>

      <section
        className={styles.panel}
        aria-labelledby="result-title"
        aria-live="polite"
      >
        <h2 id="result-title" className={styles.panelTitle}>
          Resultado
        </h2>

        {!summary ? (
          <p className={styles.empty}>
            Informe a vocação e o nível para ver o resultado.
          </p>
        ) : (
          <>
            {summary.size > 1 && (
              <div
                className={styles.status}
                data-shares={summary.sharesExperience || undefined}
              >
                <p className={styles.statusTitle}>
                  {summary.sharesExperience ? 'Divide XP' : 'Não divide XP'}
                </p>
                {!summary.sharesExperience && (
                  <p>
                    O nível mais baixo precisa ser pelo menos{' '}
                    {formatLevel(summary.requiredLowest)}, que é 2/3 do mais
                    alto.
                  </p>
                )}
              </div>
            )}

            <dl className={styles.stats}>
              {summary.size > 1 && summary.sharesExperience && (
                <>
                  <div>
                    <dt>Bônus da party</dt>
                    <dd>{formatPercent(summary.bonus)}</dd>
                  </div>
                  <div>
                    <dt>Cada um recebe</dt>
                    <dd>{formatPercent(summary.experiencePerMember)}</dd>
                  </div>
                </>
              )}
              {summary.joinRange && (
                <div>
                  <dt>Podem entrar</dt>
                  <dd>
                    {formatLevel(summary.joinRange.lowest)} a{' '}
                    {formatLevel(summary.joinRange.highest)}
                  </dd>
                </div>
              )}
            </dl>

            {summary.size > 1 && summary.sharesExperience && (
              <p className={styles.muted}>
                &quot;Cada um recebe&quot; é a parte da XP da criatura para cada
                membro, antes de stamina e outros bônus.
              </p>
            )}
          </>
        )}

        {hasUnlistedBonus(memberVocations) && (
          <p className={styles.notice}>
            A TibiaWiki não lista bônus para 5 vocações, então usamos o de 4.
          </p>
        )}

        <p className={styles.footnote}>
          Para dividir, todos também precisam estar a até 30 tiles do líder e ter
          atacado ou curado nos últimos 2 minutos. Regras do Tibia Global,
          conferidas em {PARTY_RULES_DATE.split('-').reverse().join('/')}, com
          dados da{' '}
          <a href="https://tibia.fandom.com/wiki/Party" rel="noopener">
            TibiaWiki
          </a>
          .
        </p>
      </section>
    </div>
  );
}
