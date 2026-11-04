import { useEffect, useId, useRef, useState } from 'react';
import { tools } from '../data/tools';
import { highlightMatches, searchTools } from '../domain/searchTools';
import styles from './ToolSearch.module.css';

function Highlighted({ text, query }: { text: string; query: string }) {
  return highlightMatches(text, query).map((part, index) =>
    part.match ? <mark key={index}>{part.text}</mark> : part.text,
  );
}

export default function ToolSearch() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const results = searchTools(tools, query);

  // Keeps text typed before hydration, which React would otherwise not see.
  useEffect(() => {
    const typedValue = inputRef.current?.value;

    if (typedValue) {
      setQuery(typedValue);
    }
  }, []);

  const countLabel =
    results.length === 1
      ? '1 ferramenta encontrada'
      : `${results.length} ferramentas encontradas`;

  return (
    <section aria-label="Ferramentas">
      <label className={styles.label} htmlFor={inputId}>
        Buscar ferramenta
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className={styles.input}
        type="search"
        placeholder="charm, exercise, monstro"
        autoComplete="off"
        enterKeyHint="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className={styles.status} role="status">
        {countLabel}
      </p>

      <div className={styles.sheet}>
        {results.length > 0 ? (
          <ul className={styles.list}>
            {results.map((tool) => (
              <li key={tool.id} className={styles.row}>
                <h2 className={styles.name}>
                  <Highlighted text={tool.name} query={query} />
                </h2>
                <p className={styles.description}>
                  <Highlighted text={tool.description} query={query} />
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>
            Nenhuma ferramenta encontrada. Tente charm, monstro ou exercise.
          </p>
        )}
        <p className={styles.note}>
          Estas ferramentas ainda estão em construção.
        </p>
      </div>
    </section>
  );
}
