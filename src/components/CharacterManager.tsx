import { useEffect, useState, type FormEvent } from 'react';
import { vocations } from '../domain/characterStats';
import {
  gameServers,
  type Character,
  type CharacterInfo,
  type GameServerId,
} from '../domain/characters';
import styles from './CharacterManager.module.css';

const API_URL = '/api/characters';
const LOOKUP_DELAY_MS = 500;
const MIN_NAME_LENGTH = 2;

const errorMessages: Record<string, string> = {
  duplicate: 'Você já cadastrou este personagem.',
  'not-found': 'Não encontramos este personagem.',
  limit: 'Você atingiu o limite de personagens.',
  unavailable: 'O servidor do jogo não respondeu. Tente de novo.',
};
const DEFAULT_ERROR = 'Não conseguimos concluir agora. Tente de novo.';

const errorFrom = async (response: Response) => {
  const data = (await response.json().catch(() => ({}))) as { error?: string };

  return errorMessages[data.error ?? ''] ?? DEFAULT_ERROR;
};

const vocationName = (id: string) =>
  vocations.find((vocation) => vocation.id === id)?.name ?? id;

const serverName = (id: string) =>
  gameServers.find((server) => server.id === id)?.name ?? id;

const describe = ({ server, vocation, level, world, guild }: CharacterInfo) =>
  [
    `${vocationName(vocation)} nível ${level.toLocaleString('pt-BR')}`,
    `${serverName(server)}, ${world}`,
    guild,
  ]
    .filter(Boolean)
    .join(' · ');

export default function CharacterManager() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [server, setServer] = useState<GameServerId>('rubinot');
  const [name, setName] = useState('');
  const [found, setFound] = useState<CharacterInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
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

  // Searches shortly after the player stops typing.
  useEffect(() => {
    const term = name.trim();

    setFound(null);
    setError('');

    if (term.length < MIN_NAME_LENGTH) {
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    setIsSearching(true);

    const timer = setTimeout(() => {
      const params = new URLSearchParams({ server, name: term });

      fetch(`${API_URL}/lookup?${params}`, { signal: controller.signal })
        .then(async (response) => {
          if (response.ok) {
            setFound((await response.json()) as CharacterInfo);
          } else {
            setError(await errorFrom(response));
          }

          setIsSearching(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setError(DEFAULT_ERROR);
            setIsSearching(false);
          }
        });
    }, LOOKUP_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [server, name]);

  const addCharacter = async (event: FormEvent) => {
    event.preventDefault();

    if (!found) {
      return;
    }

    setError('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: found.server, name: found.name }),
      });

      if (!response.ok) {
        setError(await errorFrom(response));
        return;
      }

      const character = (await response.json()) as Character;

      setCharacters([...characters, character]);
      setName('');
    } catch {
      setError(DEFAULT_ERROR);
    }
  };

  const refreshCharacter = async ({ id }: Character) => {
    setError('');

    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'PATCH' });

      if (!response.ok) {
        setError(await errorFrom(response));
        return;
      }

      const updated = (await response.json()) as Character;

      setCharacters(
        characters.map((item) => (item.id === id ? updated : item)),
      );
    } catch {
      setError(DEFAULT_ERROR);
    }
  };

  const removeCharacter = async ({ id, name: characterName }: Character) => {
    if (!window.confirm(`Remover ${characterName}?`)) {
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
                <span className={styles.muted}>{describe(character)}</span>
              </div>
              <button
                className={styles.textButton}
                type="button"
                aria-label={`Atualizar ${character.name}`}
                onClick={() => void refreshCharacter(character)}
              >
                Atualizar
              </button>
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
        <fieldset className={styles.servers}>
          <legend className={styles.legend}>Onde você joga?</legend>
          {gameServers.map(({ id, name: label }) => (
            <label key={id} className={styles.server}>
              <input
                type="radio"
                name="server"
                checked={server === id}
                onChange={() => setServer(id)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label className={styles.field}>
          Nome do personagem
          <input
            className={styles.input}
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        {isSearching && (
          <p className={styles.muted} role="status">
            Buscando personagem…
          </p>
        )}

        {found && (
          <div className={styles.found}>
            <strong>{found.name}</strong>
            <span className={styles.muted}>{describe(found)}</span>
          </div>
        )}

        <button className={styles.button} type="submit" disabled={!found}>
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
