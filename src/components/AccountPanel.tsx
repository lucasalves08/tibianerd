import { useEffect, useState } from 'react';
import styles from './AccountPanel.module.css';

const AUTH_URL = '/api/auth';
const REQUEST_TIMEOUT_MS = 8000;

interface Session {
  user: { name: string };
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
    <section className={styles.panel}>
      {session ? (
        <>
          <p>
            Conectado como <strong>{session.user.name}</strong>.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.button}
              type="button"
              onClick={() => void leave('sign-out')}
            >
              Sair
            </button>
            <button
              className={styles.danger}
              type="button"
              onClick={deleteAccount}
            >
              Excluir conta
            </button>
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
  );
}
