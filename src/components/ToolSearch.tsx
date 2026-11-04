import { useEffect, useId, useRef, useState } from 'react';
import { categories, tools, type CategoryId } from '../data/tools';
import { highlightMatches, searchTools } from '../domain/searchTools';
import ToolImage from './ToolImage';
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(
    null,
  );
  const matches = searchTools(tools, query);
  const countIn = (category: CategoryId) =>
    matches.filter((tool) => tool.category === category).length;
  const results = selectedCategory
    ? matches.filter((tool) => tool.category === selectedCategory)
    : matches;
  const sections = categories
    .map((category) => ({
      ...category,
      tools: results.filter((tool) => tool.category === category.id),
    }))
    .filter((section) => section.tools.length > 0);

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

      <div className={styles.filters} role="group" aria-label="Categorias">
        <button
          className={styles.filter}
          type="button"
          aria-pressed={selectedCategory === null}
          onClick={() => setSelectedCategory(null)}
        >
          Todas <span className={styles.filterCount}>{matches.length}</span>
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={styles.filter}
            type="button"
            aria-pressed={selectedCategory === category.id}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}{' '}
            <span className={styles.filterCount}>{countIn(category.id)}</span>
          </button>
        ))}
      </div>

      <p className={styles.status} role="status">
        {countLabel}
      </p>

      {sections.length > 0 ? (
        <div className={styles.sections}>
          {sections.map((section) => (
            <section
              key={section.id}
              className={styles.category}
              aria-labelledby={`${inputId}-${section.id}`}
            >
              <h2
                id={`${inputId}-${section.id}`}
                className={styles.categoryName}
              >
                {section.name}
              </h2>
              <ul className={styles.grid}>
                {section.tools.map((tool) => (
                  <li
                    key={tool.id}
                    className={styles.card}
                    data-category={tool.category}
                  >
                    <div className={styles.banner}>
                      <ToolImage className={styles.sprite} toolId={tool.id} />
                      <span className={styles.badge}>Em breve</span>
                    </div>
                    <div className={styles.body}>
                      <h3 className={styles.name}>
                        <Highlighted text={tool.name} query={query} />
                      </h3>
                      <p className={styles.description}>
                        <Highlighted text={tool.description} query={query} />
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>
          Nenhuma ferramenta encontrada. Tente charm, monstro ou exercise.
        </p>
      )}
    </section>
  );
}
