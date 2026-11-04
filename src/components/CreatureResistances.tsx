import { elements, type Creature, type Element } from '../data/creatures';
import styles from './CreatureResistances.module.css';

const elementNames: Record<Element, string> = {
  physical: 'Físico',
  earth: 'Terra',
  fire: 'Fogo',
  energy: 'Energia',
  ice: 'Gelo',
  death: 'Morte',
  holy: 'Sagrado',
};

export default function CreatureResistances({
  creature,
  showNames = false,
}: {
  creature: Creature;
  showNames?: boolean;
}) {
  return (
    <ul className={styles.list}>
      {elements.map((element) => {
        const modifier = creature.modifiers[element];

        return (
          <li
            key={element}
            className={styles.item}
            title={elementNames[element]}
            data-element={element}
            data-weak={modifier > 100 || undefined}
            data-immune={modifier === 0 || undefined}
          >
            <img
              className={styles.icon}
              src={`/icons/elements/${element}.webp`}
              width="16"
              height="16"
              alt=""
            />
            <span className={showNames ? undefined : styles.hidden}>
              {elementNames[element]}
            </span>{' '}
            {modifier}%
          </li>
        );
      })}
    </ul>
  );
}
