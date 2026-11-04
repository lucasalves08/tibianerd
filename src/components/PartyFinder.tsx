import { useEffect, useState } from 'react';
import {
  gameServers,
  type Character,
} from '../domain/characters';
import {
  adPurposes,
  findCompatibleAds,
  MAX_NOTE_LENGTH,
  type AdPurpose,
  type IncomingRequest,
  type JoinDecision,
  type OutgoingRequest,
  type PartyAdView,
} from '../domain/partyFinder';
import { getShareRange } from '../domain/partyShare';
import PlayerCard from './PlayerCard';
import PartyRequests from './PartyRequests';
import Segmented from './Segmented';
import styles from './PartyFinder.module.css';

const ADS_URL = '/api/party-ads';
const REQUESTS_URL = '/api/party-requests';
const MINUTE_IN_MS = 60 * 1000;
const SAVE_ERROR = 'Não conseguimos concluir agora. Tente de novo.';

const adGoal = ({ purpose }: Pick<PartyAdView, 'purpose'>) =>
  purpose === 'boss' ? 'Boss' : 'Hunt';

const purposeFilters = [{ id: 'all', name: 'Todos' }, ...adPurposes] as const;

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
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [characterId, setCharacterId] = useState('');
  const [note, setNote] = useState('');
  const [purpose, setPurpose] = useState<AdPurpose>('hunt');
  const [purposeFilter, setPurposeFilter] = useState<
    (typeof purposeFilters)[number]['id']
  >('all');
  const [serverFilter, setServerFilter] = useState('');
  const [worldFilter, setWorldFilter] = useState('');
  const [error, setError] = useState('');

  const loadAds = async () => {
    const response = await fetch(ADS_URL);

    if (!response.ok) {
      throw new Error('Request failed');
    }

    setAds((await response.json()) as PartyAdView[]);
  };

  const loadRequests = async () => {
    const response = await fetch(REQUESTS_URL);

    if (response.ok) {
      const data = (await response.json()) as {
        incoming: IncomingRequest[];
        outgoing: OutgoingRequest[];
      };

      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
    }
  };

  useEffect(() => {
    // Each request stands alone, so a failure in the ads keeps the login state.
    const loadCharacters = async () => {
      const response = await fetch('/api/characters');

      if (response.ok) {
        const list = (await response.json()) as Character[];

        setIsSignedIn(true);
        setCharacters(list);
        setCharacterId((current) =>
          list.some(({ id }) => id === current) ? current : (list[0]?.id ?? ''),
        );
      }
    };

    const load = () => {
      setError('');

      return Promise.all([
        loadAds().catch(() =>
          setError('Não conseguimos carregar os anúncios.'),
        ),
        loadCharacters().catch(() =>
          setError('Não conseguimos carregar seus personagens.'),
        ),
        loadRequests().catch(() =>
          setError('Não conseguimos carregar os pedidos.'),
        ),
      ]).finally(() => setIsLoading(false));
    };

    // The back button restores an old copy of the page, with old data.
    const reloadRestored = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void load();
      }
    };

    void load();
    window.addEventListener('pageshow', reloadRestored);

    return () => window.removeEventListener('pageshow', reloadRestored);
  }, []);

  const send = async (url: string, options: RequestInit) => {
    setError('');

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error('Request failed');
      }

      await Promise.all([loadAds(), loadRequests()]);
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
      body: JSON.stringify({ characterId, note, purpose }),
    });

    if (isPublished) {
      setNote('');
    }
  };

  const remove = (id: string) =>
    void send(`${ADS_URL}/${id}`, { method: 'DELETE' });

  const requestToJoin = (id: string) =>
    void send(`${ADS_URL}/${id}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId }),
    });

  const decide = (id: string, status: JoinDecision) =>
    void send(`${REQUESTS_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

  const report = (id: string) => {
    if (window.confirm('Denunciar este anúncio?')) {
      void send(`${ADS_URL}/${id}/report`, { method: 'POST' });
    }
  };

  const character = characters.find(({ id }) => id === characterId);
  const myAds = ads.filter(({ isMine }) => isMine);
  const otherAds = ads.filter(({ isMine }) => !isMine);
  const worlds = [
    ...new Set(
      otherAds
        .filter(({ server }) => !serverFilter || server === serverFilter)
        .map(({ world }) => world),
    ),
  ].sort();
  const matchingAds = character
    ? findCompatibleAds(otherAds, character, Date.now())
    : otherAds.filter(
        ({ server, world }) =>
          (!serverFilter || server === serverFilter) &&
          (!worldFilter || world === worldFilter),
      );
  const visibleAds = matchingAds.filter(
    (ad) => purposeFilter === 'all' || ad.purpose === purposeFilter,
  );

  return (
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="publish-title">
        <h2 id="publish-title" className={styles.panelTitle}>
          Publicar anúncio
        </h2>

        {isLoading ? (
          <p className={styles.muted} role="status">
            Carregando…
          </p>
        ) : !isSignedIn ? (
          <>
            <p>Entre com o Discord para publicar um anúncio.</p>
            <a
              className={styles.linkButton}
              href="/account/"
              data-astro-prefetch="false"
            >
              Entrar
            </a>
          </>
        ) : characters.length === 0 ? (
          <>
            <p>Cadastre um personagem para publicar.</p>
            <a
              className={styles.linkButton}
              href="/account/"
              data-astro-prefetch="false"
            >
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
                {characters.map(({ id, name, level, world }) => (
                  <option key={id} value={id}>
                    {name} ({formatLevel(level)}, {world})
                  </option>
                ))}
              </select>
            </label>
            <Segmented
              label="O que você procura?"
              name="purpose"
              options={adPurposes}
              value={purpose}
              onChange={setPurpose}
            />
            <label className={styles.field}>
              {purpose === 'boss' ? 'Qual boss ou rotação?' : 'Recado (opcional)'}
              <textarea
                className={styles.textarea}
                rows={3}
                maxLength={MAX_NOTE_LENGTH}
                placeholder={
                  purpose === 'boss'
                    ? 'Rotação GT fixa, ou Ferumbras hoje à noite'
                    : 'Hoje à noite, quero caçar em Roshamuul'
                }
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button
              className={styles.button}
              type="button"
              disabled={purpose === 'boss' && !note.trim()}
              onClick={() => void publish()}
            >
              Publicar anúncio
            </button>
            <p className={styles.muted}>
              O anúncio mostra seu personagem e sai do ar em 12 horas. Seu Discord
              só aparece para quem você aceitar.
            </p>
          </>
        )}

        {myAds.map((ad) => (
          <div key={ad.id} className={styles.mine}>
            <p>
              <strong>Seu anúncio:</strong> {ad.characterName},{' '}
              {formatLevel(ad.level)} · {adGoal(ad)}
              {ad.note && ` · ${ad.note}`}
            </p>
            <p className={styles.muted}>{formatRemaining(ad.expiresAt)}</p>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => remove(ad.id)}
            >
              Remover anúncio
            </button>
          </div>
        ))}

        <PartyRequests
          incoming={incoming}
          outgoing={outgoing}
          onDecide={decide}
        />

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="ads-title">
        <div>
          <h2 id="ads-title" className={styles.listTitle}>
            {character
              ? `Dividem XP com ${character.name}`
              : 'Procurando grupo'}
          </h2>
          {character && (
            <p className={styles.muted}>
              Divide com níveis {formatLevel(getShareRange(character.level).lowest)} a{' '}
              {formatLevel(getShareRange(character.level).highest)}
            </p>
          )}
        </div>

        <Segmented
          label="Mostrar"
          name="purpose-filter"
          options={purposeFilters}
          value={purposeFilter}
          onChange={setPurposeFilter}
        />

        {!character && (
          <div className={styles.filters}>
            <label className={styles.field}>
              Servidor
              <select
                className={styles.input}
                value={serverFilter}
                onChange={(event) => {
                  setServerFilter(event.target.value);
                  setWorldFilter('');
                }}
              >
                <option value="">Todos</option>
                {gameServers.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Mundo
              <select
                className={styles.input}
                value={worldFilter}
                onChange={(event) => setWorldFilter(event.target.value)}
              >
                <option value="">Todos</option>
                {worlds.map((world) => (
                  <option key={world} value={world}>
                    {world}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {!isLoading && visibleAds.length === 0 && (
          <p className={styles.empty}>
            Ninguém procurando agora. Publique um anúncio e seja o primeiro.
          </p>
        )}

        <ul className={styles.ads}>
          {visibleAds.map((ad) => (
            <li key={ad.id}>
              <PlayerCard
                character={{ ...ad, name: ad.characterName }}
                isVerified={ad.isVerified}
                corner={
                  <span className={styles.goal} data-purpose={ad.purpose}>
                    {adGoal(ad)}
                  </span>
                }
              >
                {ad.note && <p className={styles.note}>{ad.note}</p>}
                <div className={styles.adFooter}>
                  <span className={styles.muted}>
                    {formatRemaining(ad.expiresAt)}
                    {isSignedIn && (
                      <>
                        {' · '}
                        <button
                          className={styles.textButton}
                          type="button"
                          aria-label={`Denunciar anúncio de ${ad.characterName}`}
                          onClick={() => report(ad.id)}
                        >
                          Denunciar
                        </button>
                      </>
                    )}
                  </span>
                  {character && (
                    <button
                      className={styles.button}
                      type="button"
                      disabled={outgoing.some(({ adId }) => adId === ad.id)}
                      aria-label={`Pedir para entrar no grupo de ${ad.characterName}`}
                      onClick={() => requestToJoin(ad.id)}
                    >
                      {outgoing.some(({ adId }) => adId === ad.id)
                        ? 'Pedido enviado'
                        : 'Pedir para entrar'}
                    </button>
                  )}
                </div>
              </PlayerCard>
            </li>
          ))}
        </ul>

        <p className={styles.footnote}>
          Hunts mostram quem divide XP com você. Bosses mostram todos do seu
          mundo.
        </p>
      </section>
    </div>
  );
}
