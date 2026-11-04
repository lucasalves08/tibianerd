import { useEffect, useState, type FormEvent } from 'react';
import { DISCORD_INVITE_URL } from '../data/discord';
import {
  gameServers,
  type Character,
  type CharacterInfo,
  type GameServerId,
} from '../domain/characters';
import PlayerCard from './PlayerCard';
import Segmented from './Segmented';
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

const formatSync = (time: number) =>
  new Date(time).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const serverName = (id: string) =>
  gameServers.find((server) => server.id === id)?.name ?? id;

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
    <>
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
            <li key={character.id}>
              <PlayerCard
                character={character}
                isVerified={character.isVerified}
              >
                {character.syncedAt && (
                  <p className={styles.synced}>
                    Última sincronização: {formatSync(character.syncedAt)}
                  </p>
                )}
                <div className={styles.cardFooter}>
                  {character.isVerified ? (
                    <button
                      className={styles.action}
                      type="button"
                      aria-label={`Usar ${character.name} no Discord`}
                      onClick={() => void useOnDiscord(character)}
                    >
                      Usar no Discord
                    </button>
                  ) : (
                    !character.verificationCode && (
                      <button
                        className={styles.action}
                        type="button"
                        aria-label={`Verificar ${character.name}`}
                        onClick={() => void startVerification(character)}
                      >
                        Verificar personagem
                      </button>
                    )
                  )}
                  <div className={styles.icons}>
                      <button
                        className={styles.icon}
                        type="button"
                        title="Atualizar dados"
                        aria-label={`Atualizar ${character.name}`}
                        onClick={() => void refreshCharacter(character)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        className={styles.iconDanger}
                        type="button"
                        title="Remover personagem"
                        aria-label={`Remover ${character.name}`}
                        onClick={() => void removeCharacter(character)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                </div>
                {character.verificationCode && (
                  <div className={styles.verification}>
                    <p className={styles.verificationTitle}>
                      Mostre que o personagem é seu
                    </p>
                    <ol className={styles.steps}>
                      <li>
                        Copie o código{' '}
                        <code className={styles.code}>
                          {character.verificationCode}
                        </code>
                      </li>
                      <li>
                        No site do {serverName(character.server)}, cole no
                        comentário do personagem.
                      </li>
                      <li>Volte aqui e confirme. Depois pode apagar o código.</li>
                    </ol>
                    <button
                      className={styles.primary}
                      type="button"
                      onClick={() => void confirmVerification(character)}
                    >
                      Já coloquei o código
                    </button>
                  </div>
                )}
              </PlayerCard>
            </li>
          ))}
        </ul>
      )}

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

    <section className={styles.panel} aria-labelledby="add-character-title">
      <h2 id="add-character-title" className={styles.title}>
        Adicionar personagem
      </h2>
      <form className={styles.form} onSubmit={(event) => void addCharacter(event)}>
        <Segmented
          label="Onde você joga?"
          name="server"
          options={gameServers}
          value={server}
          onChange={setServer}
        />
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
          <PlayerCard character={found} />
        )}

        <button className={styles.primary} type="submit" disabled={!found}>
          Adicionar personagem
        </button>
      </form>
    </section>
    </>
  );
}
