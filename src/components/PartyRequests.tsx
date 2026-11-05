import { vocations } from '../domain/characterStats';
import type {
  IncomingRequest,
  JoinDecision,
  JoinStatus,
  OutgoingRequest,
} from '../domain/partyFinder';
import styles from './PartyFinder.module.css';

const statusLabels: Record<JoinStatus, string> = {
  pending: 'Aguardando',
  accepted: 'Aceito',
  declined: 'Recusado',
};

const vocationName = (id: string) =>
  vocations.find((vocation) => vocation.id === id)?.name ?? id;

export function AdRequests({
  adId,
  requests,
  onDecide,
}: {
  adId: string;
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
          <a
            className={styles.linkButton}
            href={`/tools/party/group/${adId}/`}
            data-astro-prefetch="false"
          >
            Ver grupo · {accepted.length + 1} jogadores
          </a>
        </div>
      )}
    </>
  );
}

// An accepted request lives on as a group, so it leaves this list.
export function OutgoingRequests({
  requests,
}: {
  requests: OutgoingRequest[];
}) {
  const open = requests.filter(({ status }) => status !== 'accepted');

  if (open.length === 0) {
    return null;
  }

  return (
    <div className={styles.requests}>
      <h3 className={styles.requestsTitle}>Seus pedidos</h3>
      <ul className={styles.ads}>
        {open.map((request) => (
          <li key={request.id} className={styles.request}>
            <div className={styles.member}>
              <strong>{request.characterName}</strong>
              <span className={styles.status} data-status={request.status}>
                {statusLabels[request.status]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
