import { useEffect, useState, type FormEvent } from 'react';
import { LAUNCH_WORLD, rubinotWorlds } from '../data/rubinotWorlds';
import { vocations } from '../domain/characterStats';
import type { Character } from '../domain/characters';
import styles from './CharacterManager.module.css';

const API_URL = '/api/characters';

const errorMessages: Record<string, string> = {
  duplicate: 'Você já cadastrou este personagem neste mundo.',
  invalid: 'Confira o nome, o mundo, a vocação e o nível.',
  limit: 'Você atingiu o limite de personagens.',
};
const DEFAULT_ERROR = 'Não conseguimos salvar agora. Tente de novo.';

const initialForm = {
  name: '',
  world: LAUNCH_WORLD as string,
  vocation: '',
  level: '',
};

const vocationName = (id: string) =>
  vocations.find((vocation) => vocation.id === id)?.name ?? id;

export default function CharacterManager() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(API_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json() as Promise<Character[]>;
      })
      .then(setCharacters)
      .catch(() => setError('Não conseguimos carregar seus personagens.'))
      .finally(() => setIsLoading(false));
  }, []);

  const addCharacter = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, level: Number(form.level) }),
      });

      if (!response.ok) {
        const { error: code } = (await response.json()) as { error: string };

        setError(errorMessages[code] ?? DEFAULT_ERROR);
        return;
      }

      const character = (await response.json()) as Character;

      setCharacters([...characters, character]);
      setForm({ ...initialForm, world: form.world });
    } catch {
      setError(DEFAULT_ERROR);
    }
  };

  const saveLevel = async ({ id }: Character, level: number) => {
    setError('');
    setCharacters(
      characters.map((item) => (item.id === id ? { ...item, level } : item)),
    );

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });

      if (!response.ok) {
        setError(errorMessages.invalid!);
      }
    } catch {
      setError(DEFAULT_ERROR);
    }
  };

  const removeCharacter = async ({ id, name }: Character) => {
    if (!window.confirm(`Remover ${name}?`)) {
      return;
    }

    setError('');

    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      setCharacters(characters.filter((item) => item.id !== id));
    } catch {
      setError(DEFAULT_ERROR);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="characters-title">
      <h2 id="characters-title" className={styles.title}>
        Seus personagens
      </h2>

      {isLoading ? (
        <p className={styles.muted} role="status">
          Carregando personagens…
        </p>
      ) : characters.length === 0 ? (
        <p className={styles.muted}>Você ainda não cadastrou personagens.</p>
      ) : (
        <ul className={styles.list}>
          {characters.map((character) => (
            <li key={character.id} className={styles.character}>
              <div className={styles.info}>
                <strong>{character.name}</strong>
                <span className={styles.muted}>
                  {vocationName(character.vocation)} · {character.world}
                </span>
              </div>
              <label className={styles.levelField}>
                Nível
                <input
                  className={styles.input}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  defaultValue={character.level}
                  aria-label={`Nível de ${character.name}`}
                  onBlur={(event) => {
                    const level = Number(event.target.value);

                    if (level !== character.level) {
                      void saveLevel(character, level);
                    }
                  }}
                />
              </label>
              <button
                className={styles.remove}
                type="button"
                aria-label={`Remover ${character.name}`}
                onClick={() => void removeCharacter(character)}
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
          ))}
        </ul>
      )}

      <form className={styles.form} onSubmit={(event) => void addCharacter(event)}>
        <label className={`${styles.field} ${styles.wide}`}>
          Nome do personagem
          <input
            className={styles.input}
            autoComplete="off"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          Mundo
          <select
            className={styles.input}
            value={form.world}
            onChange={(event) => setForm({ ...form, world: event.target.value })}
          >
            {rubinotWorlds.map((world) => (
              <option key={world} value={world}>
                {world}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Vocação
          <select
            className={styles.input}
            required
            value={form.vocation}
            onChange={(event) =>
              setForm({ ...form, vocation: event.target.value })
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
            required
            value={form.level}
            onChange={(event) => setForm({ ...form, level: event.target.value })}
          />
        </label>
        <button className={styles.button} type="submit">
          Adicionar personagem
        </button>
      </form>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
