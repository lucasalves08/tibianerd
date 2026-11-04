import { useEffect, useState, type FormEvent } from 'react';
import { DISCORD_INVITE_URL } from '../data/discord';
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
  unavailable: 'O serviço não respondeu. Tente de novo.',
  claimed: 'Este personagem já foi verificado por outra conta.',
  'code-not-found':
    'Ainda não achamos o código. Salve o comentário e tente de novo em alguns minutos.',
  'not-in-server': 'Entre no servidor do Discord e tente de novo.',
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
  const [notice, setNotice] = useState('');

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

  const startVerification = async ({ id }: Character) => {
    setError('');

    try {
      const response = await fetch(`${API_URL}/${id}/verification`, {
        method: 'POST',
      });

      if (!response.ok) {
        setError(await errorFrom(response));
        return;
      }

      const { code } = (await response.json()) as { code: string };

      setCharacters(
        characters.map((item) =>
          item.id === id ? { ...item, verificationCode: code } : item,
        ),
      );
    } catch {
      setError(DEFAULT_ERROR);
    }
  };

  const confirmVerification = async ({ id }: Character) => {
    setError('');

    try {
      const response = await fetch(`${API_URL}/${id}/verification`, {
        method: 'PUT',
      });

      if (!response.ok) {
        setError(await errorFrom(response));
        return;
      }

      setCharacters(
        characters.map((item) =>
          item.id === id
            ? { ...item, isVerified: true, verificationCode: null }
            : item,
        ),
      );
      setNotice('Personagem verificado. Pode tirar o código do comentário.');
    } catch {
      setError(DEFAULT_ERROR);
    }
  };

  const useOnDiscord = async ({ id, name: characterName }: Character) => {
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_URL}/${id}/discord`, {
        method: 'POST',
      });

      if (response.ok) {
        setNotice(`Seu perfil no Discord agora mostra ${characterName}.`);
      } else {
        setError(await errorFrom(response));
      }
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
                <strong>
                  {character.name}
                  {character.isVerified && (
                    <span className={styles.verified}> ✓ Verificado</span>
                  )}
                </strong>
                <span className={styles.muted}>{describe(character)}</span>
              </div>
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
              <div className={styles.actions}>
                <button
                  className={styles.textButton}
                  type="button"
                  aria-label={`Atualizar ${character.name}`}
                  onClick={() => void refreshCharacter(character)}
                >
                  Atualizar
                </button>
                {character.isVerified ? (
                  <button
                    className={styles.textButton}
                    type="button"
                    aria-label={`Usar ${character.name} no Discord`}
                    onClick={() => void useOnDiscord(character)}
                  >
                    Usar no Discord
                  </button>
                ) : (
                  !character.verificationCode && (
                    <button
                      className={styles.textButton}
                      type="button"
                      aria-label={`Verificar ${character.name}`}
                      onClick={() => void startVerification(character)}
                    >
                      Verificar
                    </button>
                  )
                )}
              </div>
              {character.verificationCode && (
                <div className={styles.verification}>
                  <p>
                    Coloque <strong>{character.verificationCode}</strong> no
                    comentário do personagem, na sua conta do{' '}
                    {serverName(character.server)}, e confirme.
                  </p>
                  <button
                    className={styles.button}
                    type="button"
                    onClick={() => void confirmVerification(character)}
                  >
                    Já coloquei o código
                  </button>
                </div>
              )}
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

      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <p className={styles.muted}>
        Quer conversar com a comunidade?{' '}
        <a href={DISCORD_INVITE_URL} rel="noopener">
          Entrar no Discord
        </a>
      </p>
    </section>
  );
}
