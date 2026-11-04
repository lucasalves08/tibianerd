import { getCreatureIcon } from '../data/creatureIcons';
import styles from './CreatureIcon.module.css';

export default function CreatureIcon({
  name,
  size = 64,
}: {
  name: string;
  size?: 32 | 64;
}) {
  const icon = getCreatureIcon(name);

  if (!icon) {
    return null;
  }

  return (
    <picture className={styles.icon}>
      {icon.stillFile && (
        <source
          srcSet={icon.stillFile}
          media="(prefers-reduced-motion: reduce)"
        />
      )}
      <img
        className={styles.image}
        src={icon.file}
        width={size}
        height={size}
        loading="lazy"
        alt=""
      />
    </picture>
  );
}
