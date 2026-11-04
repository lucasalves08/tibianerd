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
}: {
  creature: Creature;
}) {
  return (
    <ul className={styles.list}>
      {elements.map((element) => {
        const modifier = creature.modifiers[element];

        return (
          <li
            key={element}
            className={styles.item}
            data-weak={modifier > 100 || undefined}
            data-immune={modifier === 0 || undefined}
          >
            {elementNames[element]} {modifier}%
          </li>
        );
      })}
    </ul>
  );
}
