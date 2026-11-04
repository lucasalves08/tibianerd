import styles from './Segmented.module.css';

export default function Segmented<Value extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: readonly { id: Value; name: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.options}>
        {options.map(({ id, name: optionName }) => (
          <label key={id} className={styles.option}>
            <input
              className={styles.input}
              type="radio"
              name={name}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <span className={styles.text}>{optionName}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
