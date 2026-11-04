import { toolArt } from '../data/toolArt';
import { SPRITE_SIZE, toolSpriteGroups, toolSprites } from '../data/toolSprites';
import PixelSprite from './PixelSprite';

export default function ToolImage({
  toolId,
  className,
}: {
  toolId: string;
  className?: string;
}) {
  const group = toolSpriteGroups[toolId];

  if (group) {
    return (
      <span className="sprite-group">
        {group.map((file) => (
          <span
            key={file}
            className="vocation-walk"
            style={{ backgroundImage: `url(/sprites/${file})` }}
          />
        ))}
      </span>
    );
  }

  const sprite = toolSprites[toolId];

  if (!sprite) {
    return <PixelSprite className={className} art={toolArt[toolId]!} />;
  }

  return (
    <picture>
      {sprite.stillFile && (
        <source
          srcSet={`/sprites/${sprite.stillFile}`}
          media="(prefers-reduced-motion: reduce)"
        />
      )}
      <img
        className={className}
        src={`/sprites/${sprite.file}`}
        width={SPRITE_SIZE}
        height={SPRITE_SIZE}
        alt=""
      />
    </picture>
  );
}
