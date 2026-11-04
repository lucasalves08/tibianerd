import { useState } from 'react';
import { DISCORD_INVITE_URL } from '../data/discord';
import { vocations } from '../domain/characterStats';
import type {
  IncomingRequest,
  JoinDecision,
  OutgoingRequest,
} from '../domain/partyFinder';
import styles from './PartyFinder.module.css';

const DISCORD_USER_URL = 'https://discord.com/users/';
const ROOM_ERROR = 'Não conseguimos abrir a sala agora. Tente de novo.';

const roomErrors: Record<string, string> = {
  'not-in-server': 'Os dois precisam entrar no servidor do TibiaNerd antes.',
  full: 'Todas as salas estão ocupadas agora. Tente de novo mais tarde.',
};

const vocationName = (id: string) =>
  vocations.find((vocation) => vocation.id === id)?.name ?? id;

function DiscordContact({
  requestId,
  discord,
  discordId,
}: {
  requestId: string;
  discord: string | null;
  discordId: string | null;
}) {
  const [isOpening, setIsOpening] = useState(false);
  const [message, setMessage] = useState('');

  if (!discord) {
    return null;
  }

  const openRoom = async () => {
    setIsOpening(true);
    setMessage('');

    try {
      const response = await fetch(`/api/party-requests/${requestId}/room`, {
        method: 'POST',
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (data.url) {
        window.location.assign(data.url);
      } else {
        setMessage(roomErrors[data.error ?? ''] ?? ROOM_ERROR);
      }
    } catch {
      setMessage(ROOM_ERROR);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className={styles.contact}>
      <p>
        Discord: <strong>{discord}</strong>
        {discordId && (
          <>
            {' · '}
            <a href={`${DISCORD_USER_URL}${discordId}`} rel="noopener">
              Abrir perfil
            </a>
          </>
        )}
      </p>
      <div className={styles.decisions}>
        <button
          className={styles.button}
          type="button"
          disabled={isOpening}
          onClick={() => void openRoom()}
        >
          {isOpening ? 'Abrindo…' : 'Abrir sala da party'}
        </button>
        <a href={DISCORD_INVITE_URL} rel="noopener">
          Entrar no servidor
        </a>
      </div>
      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

export default function PartyRequests({
  incoming,
  outgoing,
  onDecide,
}: {
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
  onDecide: (id: string, status: JoinDecision) => void;
}) {
  return (
    <>
      {incoming.length > 0 && (
        <div className={styles.requests}>
          <h3 className={styles.requestsTitle}>Pedidos para entrar</h3>
          <ul className={styles.ads}>
            {incoming.map((request) => (
              <li key={request.id} className={styles.ad}>
                <p>
                  <strong>{request.characterName}</strong>{' '}
                  <span className={styles.muted}>
                    {vocationName(request.vocation)} · nível{' '}
                    {request.level.toLocaleString('pt-BR')}
                  </span>
                </p>
                {request.status === 'pending' ? (
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
                ) : (
                  <DiscordContact
                    requestId={request.id}
                    discord={request.discord}
                    discordId={request.discordId}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div className={styles.requests}>
          <h3 className={styles.requestsTitle}>Seus pedidos</h3>
          <ul className={styles.ads}>
            {outgoing.map((request) => (
              <li key={request.id} className={styles.ad}>
                <p>
                  <strong>{request.characterName}</strong>{' '}
                  <span className={styles.muted}>
                    {request.status === 'pending' && 'Aguardando resposta'}
                    {request.status === 'accepted' && 'Aceito'}
                    {request.status === 'declined' && 'Recusado'}
                  </span>
                </p>
                <DiscordContact
                  requestId={request.id}
                  discord={request.discord}
                  discordId={request.discordId}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
