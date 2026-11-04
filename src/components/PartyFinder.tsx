import { useEffect, useState } from 'react';
import { LAUNCH_WORLD } from '../data/rubinotWorlds';
import { vocations } from '../domain/characterStats';
import type { Character } from '../domain/characters';
import {
  findCompatibleAds,
  MAX_NOTE_LENGTH,
  type PartyAdView,
} from '../domain/partyFinder';
import styles from './PartyFinder.module.css';

const ADS_URL = '/api/party-ads';
const MINUTE_IN_MS = 60 * 1000;
const SAVE_ERROR = 'Não conseguimos concluir agora. Tente de novo.';

const vocationName = (id: string) =>
  vocations.find((vocation) => vocation.id === id)?.name ?? id;

const formatLevel = (level: number) => level.toLocaleString('pt-BR');

const formatRemaining = (expiresAt: number) => {
  const minutes = Math.max(Math.ceil((expiresAt - Date.now()) / MINUTE_IN_MS), 1);

  return minutes < 60
    ? `expira em ${minutes} min`
    : `expira em ${Math.round(minutes / 60)} h`;
};

export default function PartyFinder() {
  const [ads, setAds] = useState<PartyAdView[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [characterId, setCharacterId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const loadAds = async () => {
    const response = await fetch(ADS_URL);

    if (!response.ok) {
      throw new Error('Request failed');
    }

    setAds((await response.json()) as PartyAdView[]);
  };

  useEffect(() => {
    const load = async () => {
      await loadAds();

      const response = await fetch('/api/characters');

      if (response.ok) {
        const list = (await response.json()) as Character[];
        const available = list.filter(({ world }) => world === LAUNCH_WORLD);

        setIsSignedIn(true);
        setCharacters(available);
        setCharacterId(available[0]?.id ?? '');
      }
    };

    load()
      .catch(() => setError('Não conseguimos carregar os anúncios.'))
      .finally(() => setIsLoading(false));
  }, []);

  const send = async (url: string, options: RequestInit) => {
    setError('');

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error('Request failed');
      }

      await loadAds();
      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    }
  };

  const publish = async () => {
    const isPublished = await send(ADS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, note }),
    });

    if (isPublished) {
      setNote('');
    }
  };

  const remove = (id: string) =>
    void send(`${ADS_URL}/${id}`, { method: 'DELETE' });

  const report = (id: string) => {
    if (window.confirm('Denunciar este anúncio?')) {
      void send(`${ADS_URL}/${id}/report`, { method: 'POST' });
    }
  };

  const character = characters.find(({ id }) => id === characterId);
  const myAds = ads.filter(({ isMine }) => isMine);
  const otherAds = ads.filter(({ isMine }) => !isMine);
  const visibleAds = character
    ? findCompatibleAds(otherAds, character, Date.now())
    : otherAds;

  return (
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="publish-title">
        <h2 id="publish-title" className={styles.panelTitle}>
          Procurar party
        </h2>

        {isLoading ? (
          <p className={styles.muted} role="status">
            Carregando…
          </p>
        ) : !isSignedIn ? (
          <>
            <p>Entre com o Discord para publicar um anúncio.</p>
            <a className={styles.linkButton} href="/conta/">
              Entrar
            </a>
          </>
        ) : characters.length === 0 ? (
          <>
            <p>Cadastre um personagem de {LAUNCH_WORLD} para publicar.</p>
            <a className={styles.linkButton} href="/conta/">
              Cadastrar personagem
            </a>
          </>
        ) : (
          <>
            <label className={styles.field}>
              Personagem
              <select
                className={styles.input}
                value={characterId}
                onChange={(event) => setCharacterId(event.target.value)}
              >
                {characters.map(({ id, name, level }) => (
                  <option key={id} value={id}>
                    {name} ({formatLevel(level)})
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Recado (opcional)
              <input
                className={styles.input}
                maxLength={MAX_NOTE_LENGTH}
                placeholder="Hoje à noite, quero caçar em Roshamuul"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button
              className={styles.button}
              type="button"
              onClick={() => void publish()}
            >
              Publicar anúncio
            </button>
            <p className={styles.muted}>
              O anúncio mostra seu personagem e seu nome no Discord, e sai do ar
              em 6 horas.
            </p>
          </>
        )}

        {myAds.map(({ id, characterName, level, note: myNote, expiresAt }) => (
          <div key={id} className={styles.mine}>
            <p>
              <strong>Seu anúncio:</strong> {characterName},{' '}
              {formatLevel(level)}
              {myNote && ` · ${myNote}`}
            </p>
            <p className={styles.muted}>{formatRemaining(expiresAt)}</p>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => remove(id)}
            >
              Remover anúncio
            </button>
          </div>
        ))}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="ads-title">
        <h2 id="ads-title" className={styles.panelTitle}>
          {character
            ? `Dividem XP com ${character.name}`
            : `Procurando party em ${LAUNCH_WORLD}`}
        </h2>

        {!isLoading && visibleAds.length === 0 && (
          <p className={styles.empty}>
            Ninguém procurando agora. Publique um anúncio e seja o primeiro.
          </p>
        )}

        <ul className={styles.ads}>
          {visibleAds.map((ad) => (
            <li key={ad.id} className={styles.ad}>
              <div className={styles.adHeader}>
                <h3 className={styles.adName}>{ad.characterName}</h3>
                <span className={styles.muted}>
                  {vocationName(ad.vocation)} · nível {formatLevel(ad.level)}
                </span>
              </div>
              {ad.note && <p>{ad.note}</p>}
              <p className={styles.contact}>
                Discord: <strong>{ad.discord}</strong>
              </p>
              <div className={styles.adFooter}>
                <span className={styles.muted}>
                  {formatRemaining(ad.expiresAt)}
                </span>
                {isSignedIn && (
                  <button
                    className={styles.textButton}
                    type="button"
                    aria-label={`Denunciar anúncio de ${ad.characterName}`}
                    onClick={() => report(ad.id)}
                  >
                    Denunciar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <p className={styles.footnote}>
          Só para RubinOT, em {LAUNCH_WORLD}. A faixa de nível usa a regra de 2/3
          do Tibia. Os personagens não são verificados.
        </p>
      </section>
    </div>
  );
}
