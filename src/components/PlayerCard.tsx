import type { ReactNode } from 'react';
import { vocations } from '../domain/characterStats';
import { gameServers, type CharacterInfo } from '../domain/characters';
import CharacterSprite from './CharacterSprite';
import styles from './PlayerCard.module.css';

type CardCharacter = Pick<
  CharacterInfo,
  'name' | 'outfit' | 'vocation' | 'sex' | 'level' | 'server' | 'world'
> & { guild?: string | null };

const vocationName = (id: string) =>
  vocations.find((vocation) => vocation.id === id)?.name ?? id;

const serverName = (id: string) =>
  gameServers.find((server) => server.id === id)?.name ?? id;

export default function PlayerCard({
  character,
  isVerified = false,
  corner,
  children,
}: {
  character: CardCharacter;
  isVerified?: boolean;
  corner?: ReactNode;
  children?: ReactNode;
}) {
  const { name, vocation, level, server, world, guild } = character;

  return (
    <article className={styles.card} data-vocation={vocation}>
      <div className={styles.header}>
        <div className={styles.portrait}>
          <CharacterSprite className={styles.sprite} character={character} />
        </div>
        <div className={styles.main}>
          <h3 className={styles.name}>
            <span>{name}</span>
            {isVerified && (
              <svg
                className={styles.verified}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Personagem verificado"
              >
                <title>Personagem verificado</title>
                <path
                  d="M12 2.5 14.6 4.4 17.8 4.3 18.8 7.3 21.4 9.2 20.4 12.2 21.4 15.2 18.8 17 17.8 20.1 14.6 20 12 21.9 9.4 20 6.2 20.1 5.2 17 2.6 15.2 3.6 12.2 2.6 9.2 5.2 7.3 6.2 4.3 9.4 4.4Z"
                  fill="currentColor"
                />
                <path
                  d="M8 12.2 10.8 15 16 9.5"
                  fill="none"
                  stroke="var(--color-background)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </h3>
          <p className={styles.vocation}>
            {vocationName(vocation)} · {level.toLocaleString('pt-BR')}
          </p>
          <p className={styles.place}>
            {serverName(server)} · {world}
            {guild && ` · ${guild}`}
          </p>
        </div>
        {corner && <div className={styles.corner}>{corner}</div>}
      </div>
      {children}
    </article>
  );
}
