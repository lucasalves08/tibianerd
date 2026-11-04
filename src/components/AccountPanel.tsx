import { useEffect, useState } from 'react';
import CharacterManager from './CharacterManager';
import styles from './AccountPanel.module.css';

const AUTH_URL = '/api/auth';
const REQUEST_TIMEOUT_MS = 8000;
const ACCOUNT_KEY = 'tibianerd:account';
const ACCOUNT_IMAGE_KEY = 'tibianerd:account-image';

interface Session {
  user: { name: string; image?: string | null };
}

const postAuth = (path: string, body: object = {}) =>
  fetch(`${AUTH_URL}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

export default function AccountPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // A stuck request must not hide the login button.
    fetch(`${AUTH_URL}/get-session`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then(setSession)
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  }, []);

  // The header reads this to show the name on every page.
  useEffect(() => {
    if (isLoading) {
      return;
    }

    try {
      localStorage.removeItem(ACCOUNT_IMAGE_KEY);

      if (session) {
        localStorage.setItem(ACCOUNT_KEY, session.user.name);

        if (session.user.image) {
          localStorage.setItem(ACCOUNT_IMAGE_KEY, session.user.image);
        }
      } else {
        localStorage.removeItem(ACCOUNT_KEY);
      }
    } catch {
      // Nothing to do: the link just keeps saying Entrar.
    }
  }, [session, isLoading]);

  const run = async (action: () => Promise<void>) => {
    setHasError(false);

    try {
      await action();
    } catch {
      setHasError(true);
    }
  };

  const signIn = () =>
    run(async () => {
      const response = await postAuth('sign-in/social', {
        provider: 'discord',
        callbackURL: window.location.pathname,
      });

      if (!response.ok) {
        throw new Error('Sign in failed');
      }

      const { url } = (await response.json()) as { url: string };

      window.location.assign(url);
    });

  const leave = (path: string) =>
    run(async () => {
      const response = await postAuth(path);

      if (!response.ok) {
        throw new Error('Request failed');
      }

      setSession(null);
    });

  const deleteAccount = () => {
    if (window.confirm('Excluir sua conta e todos os seus dados?')) {
      void leave('delete-user');
    }
  };

  if (isLoading) {
    return (
      <p className={styles.panel} role="status">
        Carregando…
      </p>
    );
  }

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        {session ? (
          <>
            <div className={styles.user}>
              {session.user.image && (
                <img
                  className={styles.photo}
                  src={session.user.image}
                  width="56"
                  height="56"
                  alt=""
                />
              )}
              <div>
                <p className={styles.name}>{session.user.name}</p>
                <p className={styles.muted}>Conectado com o Discord</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p>
              Usamos só o seu nome de usuário do Discord. Não pedimos seu e-mail.
            </p>
            <button
              className={styles.discord}
              type="button"
              onClick={() => void signIn()}
            >
              Entrar com Discord
            </button>
          </>
        )}

        {hasError && (
          <p className={styles.error} role="alert">
            Não conseguimos concluir agora. Tente de novo.
          </p>
        )}
      </section>
      {session && <CharacterManager />}
      {session && (
        <details className={styles.options}>
          <summary>Opções da conta</summary>
          <div className={styles.actions}>
            <button
              className={styles.quiet}
              type="button"
              onClick={() => void leave('sign-out')}
            >
              Sair da conta
            </button>
            <button
              className={styles.danger}
              type="button"
              onClick={deleteAccount}
            >
              Excluir conta e dados
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
