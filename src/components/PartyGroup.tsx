import { useEffect, useState } from 'react';
import { useLiveRefresh } from './useLiveRefresh';
import { DISCORD_INVITE_URL } from '../data/discord';
import { gameServers } from '../domain/characters';
import {
  getDaysLeft,
  GROUP_IDLE_DAYS,
  MAX_HUNT_TEXT_LENGTH,
  type GroupDetails,
  type GroupHunt,
  type GroupMember,
} from '../domain/partyGroups';
import { formatHuntStart, getLootSplit } from '../domain/partyHunt';
import { getDiscordAppUrl } from '../domain/partyRooms';
import PlayerCard from './PlayerCard';
import finder from './PartyFinder.module.css';
import styles from './PartyGroup.module.css';

const DISCORD_USER_URL = 'https://discord.com/users/';
const SAVE_ERROR = 'Não conseguimos concluir agora. Tente de novo.';
const ROOM_ERROR = 'Não conseguimos abrir a sala agora. Tente de novo.';
const JOIN_ERROR =
  'Não conseguimos colocar você no servidor. Tente de novo ou use o convite.';
const JOIN_SCOPE = 'guilds.join';

const roomErrors: Record<string, string> = {
  full: 'Todas as salas estão ocupadas agora. Tente de novo mais tarde.',
};

const huntErrors: Record<number, string> = {
  400: 'Não reconhecemos esse texto. Copie o Party Hunt Analyser inteiro no jogo e cole aqui.',
  409: 'Essa hunt já está no grupo.',
};

const formatGold = (value: number) => value.toLocaleString('pt-BR');

const goalName = (purpose: GroupDetails['purpose']) =>
  purpose === 'boss' ? 'Boss' : 'Hunt';

const serverName = (id: string) =>
  gameServers.find((server) => server.id === id)?.name ?? id;

function RoomButton({ groupId }: { groupId: string }) {
  const [isOpening, setIsOpening] = useState(false);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<{ url: string; inviteUrl?: string } | null>(
    null,
  );
  const [inServer, setInServer] = useState<boolean | null>();

  const checkServer = async () => {
    try {
      const response = await fetch(`/api/party-groups/${groupId}/room`);
      const data = (await response.json()) as { inServer?: boolean | null };

      setInServer(data.inServer ?? null);
    } catch {
      setInServer(null);
    }
  };

  useEffect(() => {
    const finishJoin = async () => {
      const result = new URLSearchParams(window.location.search).get('server');

      if (!result) {
        return;
      }

      window.history.replaceState(null, '', window.location.pathname);

      const response =
        result === 'authorized'
          ? await fetch('/api/discord/join', { method: 'POST' }).catch(() => null)
          : null;

      if (!response?.ok) {
        setMessage(JOIN_ERROR);
      }
    };

    void finishJoin().then(checkServer);
    // The id never changes while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The site is not told when someone joins, so it keeps looking until they do.
  useLiveRefresh(() => {
    if (inServer === false) {
      void checkServer();
    }
  });

  // Discord asks for the player's consent before anyone is added to a server.
  const askToJoin = async () => {
    const page = window.location.pathname;

    setMessage('');

    try {
      const response = await fetch('/api/auth/link-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'discord',
          scopes: [JOIN_SCOPE],
          callbackURL: `${page}?server=authorized`,
          errorCallbackURL: `${page}?server=denied`,
        }),
      });
      const { url } = (await response.json()) as { url?: string };

      if (url) {
        window.location.assign(url);
      } else {
        setMessage(JOIN_ERROR);
      }
    } catch {
      setMessage(JOIN_ERROR);
    }
  };

  const openRoom = async () => {
    setIsOpening(true);
    setMessage('');
    setRoom(null);
    setIsConnected(false);

    try {
      const response = await fetch(`/api/party-groups/${groupId}/room`, {
        method: 'POST',
      });
      const data = (await response.json()) as {
        url?: string;
        inviteUrl?: string | null;
        isConnected?: boolean;
        missing?: string[];
        error?: string;
      };

      if (data.error === 'not-in-server') {
        setInServer(false);
        return;
      }

      if (!data.url) {
        setMessage(roomErrors[data.error ?? ''] ?? ROOM_ERROR);
        return;
      }

      if (data.isConnected) {
        setIsConnected(true);
      } else {
        // The app takes over and this page stays open behind it.
        setRoom({ url: data.url, inviteUrl: data.inviteUrl ?? undefined });
        window.location.assign(getDiscordAppUrl(data.inviteUrl ?? data.url));
      }

      if (data.missing?.length) {
        setMessage(
          `Fora do servidor: ${data.missing.join(', ')}. Entram quando a sala for aberta de novo.`,
        );
      }
    } catch {
      setMessage(ROOM_ERROR);
    } finally {
      setIsOpening(false);
    }
  };

  if (inServer === false) {
    return (
      <div className={styles.room}>
        <button
          className={finder.button}
          type="button"
          onClick={() => void askToJoin()}
        >
          Entrar no servidor do Discord
        </button>
        <p className={finder.muted}>
          O Discord vai pedir sua autorização, e ela é usada só uma vez. Se
          preferir,{' '}
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
            entre pelo convite
          </a>
          .
        </p>
        {message && (
          <p className={finder.error} role="alert">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.room}>
      <button
        className={finder.button}
        type="button"
        disabled={isOpening || inServer === undefined}
        onClick={() => void openRoom()}
      >
        {inServer === undefined
          ? 'Verificando…'
          : isOpening
            ? 'Abrindo…'
            : 'Entrar na sala'}
      </button>
      <p className={finder.muted}>
        Quem estiver em Procurando party, no Discord, cai direto na sala. O bot
        chama os outros.
      </p>
      {isConnected && <p role="status">Você já está na sala.</p>}
      {room && (
        <p className={styles.roomLinks}>
          <span className={finder.muted}>Sala pronta. Não abriu?</span>
          <a href={getDiscordAppUrl(room.url)}>Abrir no app</a>
          <a
            href={room.inviteUrl ?? room.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir no navegador
          </a>
        </p>
      )}
      {message && (
        <p className={finder.error} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

function MemberCard({
  member,
  canRemove,
  onRemove,
}: {
  member: GroupMember;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { discord, discordId, isLeader, isVerified } = member;

  return (
    <PlayerCard
      character={member}
      isVerified={isVerified}
      corner={isLeader && <span className={finder.status}>Líder</span>}
    >
      <div className={finder.adFooter}>
        {discord && discordId ? (
          <a
            href={`${DISCORD_USER_URL}${discordId}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir perfil de ${discord} no Discord`}
          >
            {discord}
          </a>
        ) : (
          <span className={finder.muted}>{discord}</span>
        )}
        {canRemove && (
          <button
            className={finder.textButton}
            type="button"
            aria-label={
              member.isMine ? 'Sair do grupo' : `Remover ${member.name} do grupo`
            }
            onClick={onRemove}
          >
            {member.isMine ? 'Sair do grupo' : 'Remover'}
          </button>
        )}
      </div>
    </PlayerCard>
  );
}

function HuntCard({
  hunt,
  onRemove,
}: {
  hunt: GroupHunt;
  onRemove: () => void;
}) {
  const { total, share, transfers } = getLootSplit(hunt.players);
  const date = hunt.sessionStart
    ? formatHuntStart(hunt.sessionStart)
    : new Date(hunt.createdAt).toLocaleDateString('pt-BR');

  return (
    <li className={styles.hunt}>
      <div className={finder.adFooter}>
        <h3 className={finder.mineTitle}>
          {date}
          {hunt.duration && ` · ${hunt.duration}`}
        </h3>
        {hunt.canRemove && (
          <button
            className={finder.textButton}
            type="button"
            aria-label={`Remover hunt de ${date}`}
            onClick={onRemove}
          >
            Remover
          </button>
        )}
      </div>
      <dl className={styles.totals}>
        <div>
          <dt>Saldo da hunt</dt>
          <dd>{formatGold(total)}</dd>
        </div>
        <div>
          <dt>Cada um fica com</dt>
          <dd>{formatGold(share)}</dd>
        </div>
      </dl>
      {transfers.length > 0 ? (
        <ul className={styles.transfers}>
          {transfers.map(({ from, to, amount }) => (
            <li key={`${from}-${to}`}>
              <span>
                <strong>{from}</strong> paga <strong>{to}</strong>
              </span>
              <span className={styles.amount}>{formatGold(amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={finder.muted}>Ninguém precisa pagar ninguém.</p>
      )}
    </li>
  );
}

export default function PartyGroup({ groupId }: { groupId: string }) {
  const url = `/api/party-groups/${groupId}`;
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'signed-out' | 'missing'>(
    'loading',
  );
  const [text, setText] = useState('');
  const [huntError, setHuntError] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch(url);

    if (response.status === 401) {
      setStatus('signed-out');
    } else if (response.status === 404) {
      setStatus('missing');
    } else if (!response.ok) {
      setStatus((current) => (current === 'ready' ? current : 'missing'));
    } else {
      setGroup((await response.json()) as GroupDetails);
      setStatus('ready');
    }
  };

  useEffect(() => {
    load().catch(() => setStatus('missing'));
    // The id never changes while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLiveRefresh(() => {
    load().catch(() => {});
  });

  const remove = async (path: string) => {
    setError('');

    try {
      const response = await fetch(`${url}${path}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    }
  };

  const removeAndReload = async (path: string) => {
    if (await remove(path)) {
      await load().catch(() => setError(SAVE_ERROR));
    }
  };

  const addHunt = async () => {
    setHuntError('');

    try {
      const response = await fetch(`${url}/hunts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        setHuntError(huntErrors[response.status] ?? SAVE_ERROR);
        return;
      }

      setText('');
      await load();
    } catch {
      setHuntError(SAVE_ERROR);
    }
  };

  const leaveGroup = async (member: GroupMember) => {
    if (window.confirm('Sair deste grupo?') && (await remove(`/members/${member.id}`))) {
      window.location.assign('/tools/party/');
    }
  };

  const removeMember = (member: GroupMember) => {
    if (window.confirm(`Remover ${member.name} do grupo?`)) {
      void removeAndReload(`/members/${member.id}`);
    }
  };

  const closeGroup = async () => {
    if (
      window.confirm('Encerrar o grupo para todos? As hunts salvas também serão apagadas.') &&
      (await remove(''))
    ) {
      window.location.assign('/tools/party/');
    }
  };

  if (status === 'loading') {
    return (
      <p className={finder.muted} role="status">
        Carregando…
      </p>
    );
  }

  if (status === 'signed-out') {
    return (
      <div className={styles.notice}>
        <h1 className={styles.title}>Grupo</h1>
        <p>Entre com o Discord para ver este grupo.</p>
        <a className={finder.linkButton} href="/account/" data-astro-prefetch="false">
          Entrar
        </a>
      </div>
    );
  }

  if (status === 'missing' || !group) {
    return (
      <div className={styles.notice}>
        <h1 className={styles.title}>Grupo não encontrado</h1>
        <p>Ele pode ter sido encerrado, ou você não faz parte dele.</p>
        <a className={finder.linkButton} href="/tools/party/">
          Procurar grupo
        </a>
      </div>
    );
  }

  const daysLeft = getDaysLeft(group.expiresAt, Date.now());

  return (
    <div className={styles.page}>
      <a className={styles.back} href="/tools/party/">
        Procurar grupo
      </a>

      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Grupo de {group.ownerName}</h1>
          <p className={finder.muted}>
            {goalName(group.purpose)} · {serverName(group.server)} · {group.world} ·{' '}
            {group.memberCount} {group.memberCount === 1 ? 'jogador' : 'jogadores'}
          </p>
          {group.note && <p className={finder.note}>{group.note}</p>}
        </div>
        <RoomButton groupId={group.id} />
      </header>

      {error && (
        <p className={finder.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.columns}>
        <section className={finder.panel} aria-labelledby="members-title">
          <h2 id="members-title" className={finder.panelTitle}>
            Integrantes
          </h2>
          <ul className={finder.ads}>
            {group.members.map((member) => (
              <li key={member.id}>
                <MemberCard
                  member={member}
                  canRemove={!member.isLeader && (group.isLeader || member.isMine)}
                  onRemove={() =>
                    void (member.isMine ? leaveGroup(member) : removeMember(member))
                  }
                />
              </li>
            ))}
          </ul>
        </section>

        <section className={finder.panel} aria-labelledby="hunts-title">
          <h2 id="hunts-title" className={finder.panelTitle}>
            Hunts do grupo
          </h2>
          <label className={finder.field}>
            Party Hunt Analyser
            <textarea
              className={finder.textarea}
              rows={5}
              maxLength={MAX_HUNT_TEXT_LENGTH}
              placeholder="No jogo, copie o Party Hunt Analyser e cole aqui"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button
            className={finder.button}
            type="button"
            disabled={!text.trim()}
            onClick={() => void addHunt()}
          >
            Adicionar hunt
          </button>
          {huntError && (
            <p className={finder.error} role="alert">
              {huntError}
            </p>
          )}

          {group.hunts.length > 0 ? (
            <ul className={finder.ads}>
              {group.hunts.map((hunt) => (
                <HuntCard
                  key={hunt.id}
                  hunt={hunt}
                  onRemove={() => {
                    if (window.confirm('Remover esta hunt?')) {
                      void removeAndReload(`/hunts/${hunt.id}`);
                    }
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className={finder.muted}>
              Cole a primeira hunt para ver quem paga quanto a quem.
            </p>
          )}
        </section>
      </div>

      <footer className={finder.adFooter}>
        <p className={finder.muted}>
          O grupo some {GROUP_IDLE_DAYS} dias depois da última hunt.{' '}
          {daysLeft === 1 ? 'Falta 1 dia.' : `Faltam ${daysLeft} dias.`}
        </p>
        {group.isLeader && (
          <button
            className={finder.textButton}
            type="button"
            onClick={() => void closeGroup()}
          >
            Encerrar grupo
          </button>
        )}
      </footer>
    </div>
  );
}
