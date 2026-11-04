import { useState } from 'react';
import { getCharacterSprite, type CharacterInfo } from '../domain/characters';

export default function CharacterSprite({
  character: { outfit, vocation, sex },
  className,
}: {
  character: Pick<CharacterInfo, 'outfit' | 'vocation' | 'sex'>;
  className?: string;
}) {
  const [hasFailed, setHasFailed] = useState(false);

  // Our own walking sprite stands in when the game has no image to offer.
  if (!outfit || hasFailed) {
    return (
      <span
        className="vocation-walk"
        style={{
          backgroundImage: `url(${getCharacterSprite({ outfit: null, vocation, sex })})`,
        }}
      />
    );
  }

  return (
    <img
      className={className}
      src={getCharacterSprite({ outfit, vocation, sex })}
      width="84"
      height="84"
      loading="lazy"
      alt=""
      onError={() => setHasFailed(true)}
    />
  );
}
