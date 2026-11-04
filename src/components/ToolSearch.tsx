import { useId, useState } from 'react';
import { tools } from '../data/tools';
import { searchTools } from '../domain/searchTools';
import styles from './ToolSearch.module.css';

export default function ToolSearch() {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const results = searchTools(tools, query);
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
        id={inputId}
        className={styles.input}
        type="search"
        placeholder="Ex.: charm, exercise, monstro"
        autoComplete="off"
        enterKeyHint="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className={styles.status} role="status">
        {countLabel}
      </p>

      {results.length > 0 ? (
        <ul className={styles.grid}>
          {results.map((tool) => (
            <li key={tool.id} className={styles.card}>
              <h2 className={styles.name}>{tool.name}</h2>
              <p className={styles.description}>{tool.description}</p>
              <span className={styles.badge}>Em breve</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Nenhuma ferramenta encontrada.</p>
      )}
    </section>
  );
}
