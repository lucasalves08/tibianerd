import { useState } from 'react';
import { DISCORD_INVITE_URL } from '../data/discord';
import { vocations } from '../domain/characterStats';
import type {
  IncomingRequest,
  JoinDecision,
  JoinStatus,
  OutgoingRequest,
} from '../domain/partyFinder';
import styles from './PartyFinder.module.css';

const DISCORD_USER_URL = 'https://discord.com/users/';
const ROOM_ERROR = 'Não conseguimos abrir a sala agora. Tente de novo.';
const ROOM_PARTIAL =
  'Sala aberta, mas quem não entrou no servidor do TibiaNerd ficou de fora.';

const roomErrors: Record<string, string> = {
  'not-in-server': 'Todos precisam entrar no servidor do TibiaNerd antes.',
  full: 'Todas as salas estão ocupadas agora. Tente de novo mais tarde.',
};

const statusLabels: Record<JoinStatus, string> = {
  pending: 'Aguardando',
  accepted: 'Aceito',
  declined: 'Recusado',
};

const vocationName = (id: string) =>
  vocations.find((vocation) => vocation.id === id)?.name ?? id;

function DiscordProfile({
  discord,
  discordId,
}: {
  discord: string | null;
  discordId: string | null;
}) {
  if (!discord) {
    return null;
  }

  return discordId ? (
    <a
      href={`${DISCORD_USER_URL}${discordId}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir perfil de ${discord} no Discord`}
    >
      {discord}
    </a>
  ) : (
    <span>{discord}</span>
  );
}

function RoomActions({ requestIds }: { requestIds: string[] }) {
  const [isOpening, setIsOpening] = useState(false);
  const [message, setMessage] = useState('');
  const [roomUrl, setRoomUrl] = useState('');

  const openRoom = async () => {
    setIsOpening(true);
    setMessage('');
    setRoomUrl('');

    // Browsers only allow a new tab during the click, before any waiting.
    const tab = window.open('about:blank', '_blank');
    let url: string | undefined;
    let error: string | undefined;

    if (tab) {
      tab.opener = null;
    }

    try {
      // One at a time: the first call creates the room and the rest join it.
      for (const id of requestIds) {
        const response = await fetch(`/api/party-requests/${id}/room`, {
          method: 'POST',
        });
        const data = (await response.json()) as {
          url?: string;
          error?: string;
        };

        url ??= data.url;
        error = data.error ?? error;
      }
    } catch {
      error = 'failed';
    }

    setIsOpening(false);

    if (!url) {
      tab?.close();
      setMessage(roomErrors[error ?? ''] ?? ROOM_ERROR);
      return;
    }

    // A blocked tab leaves a link, so our page always stays open.
    if (tab) {
      tab.location.href = url;
    } else {
      setRoomUrl(url);
    }

    if (error) {
      setMessage(ROOM_PARTIAL);
    }
  };

  return (
    <div className={styles.room}>
      <button
        className={styles.button}
        type="button"
        disabled={isOpening}
        onClick={() => void openRoom()}
      >
        {isOpening ? 'Abrindo…' : 'Abrir sala do grupo'}
      </button>
      <p className={styles.muted}>
        A sala fica no servidor do TibiaNerd.{' '}
        <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
          Entrar no servidor
        </a>
      </p>
      {roomUrl && (
        <a href={roomUrl} target="_blank" rel="noopener noreferrer">
          Abrir a sala no Discord
        </a>
      )}
      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

export function AdRequests({
  requests,
  onDecide,
}: {
  requests: IncomingRequest[];
  onDecide: (id: string, status: JoinDecision) => void;
}) {
  const pending = requests.filter(({ status }) => status === 'pending');
  const accepted = requests.filter(({ status }) => status === 'accepted');

  return (
    <>
      {pending.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.requestsTitle}>
            Pedidos para entrar ({pending.length})
          </h4>
          <ul className={styles.members}>
            {pending.map((request) => (
              <li key={request.id} className={styles.member}>
                <p>
                  <strong>{request.characterName}</strong>
                  <span className={styles.muted}>
                    {vocationName(request.vocation)} ·{' '}
                    {request.level.toLocaleString('pt-BR')}
                  </span>
                </p>
                <div className={styles.decisions}>
                  <button
                    className={styles.button}
                    type="button"
                    aria-label={`Aceitar ${request.characterName}`}
                    onClick={() => onDecide(request.id, 'accepted')}
                  >
                    Aceitar
                  </button>
                  <button
                    className={styles.textButton}
                    type="button"
                    aria-label={`Recusar ${request.characterName}`}
                    onClick={() => onDecide(request.id, 'declined')}
                  >
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {accepted.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.requestsTitle}>
            Grupo · {accepted.length + 1} jogadores
          </h4>
          <ul className={styles.members}>
            {accepted.map((request) => (
              <li key={request.id} className={styles.member}>
                <p>
                  <strong>{request.characterName}</strong>
                  <span className={styles.muted}>
                    {vocationName(request.vocation)} ·{' '}
                    {request.level.toLocaleString('pt-BR')}
                  </span>
                </p>
                <DiscordProfile
                  discord={request.discord}
                  discordId={request.discordId}
                />
              </li>
            ))}
          </ul>
          <RoomActions requestIds={accepted.map(({ id }) => id)} />
        </div>
      )}
    </>
  );
}

export function OutgoingRequests({
  requests,
}: {
  requests: OutgoingRequest[];
}) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <div className={styles.requests}>
      <h3 className={styles.requestsTitle}>Seus pedidos</h3>
      <ul className={styles.ads}>
        {requests.map((request) => (
          <li key={request.id} className={styles.request}>
            <div className={styles.member}>
              <strong>{request.characterName}</strong>
              <span className={styles.status} data-status={request.status}>
                {statusLabels[request.status]}
              </span>
            </div>
            {request.status === 'accepted' && (
              <>
                <p className={styles.muted}>
                  Discord:{' '}
                  <DiscordProfile
                    discord={request.discord}
                    discordId={request.discordId}
                  />
                </p>
                <RoomActions requestIds={[request.id]} />
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
