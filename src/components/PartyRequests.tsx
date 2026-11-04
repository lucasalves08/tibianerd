import { vocations } from '../domain/characterStats';
import type {
  IncomingRequest,
  JoinDecision,
  OutgoingRequest,
} from '../domain/partyFinder';
import styles from './PartyFinder.module.css';

const DISCORD_USER_URL = 'https://discord.com/users/';

const vocationName = (id: string) =>
  vocations.find((vocation) => vocation.id === id)?.name ?? id;

function DiscordContact({
  discord,
  discordId,
}: {
  discord: string | null;
  discordId: string | null;
}) {
  if (!discord) {
    return null;
  }

  return (
    <p className={styles.contact}>
      Discord: <strong>{discord}</strong>
      {discordId && (
        <>
          {' · '}
          <a href={`${DISCORD_USER_URL}${discordId}`} rel="noopener">
            Abrir no Discord
          </a>
        </>
      )}
    </p>
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
