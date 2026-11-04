import { toolArt } from '../data/toolArt';
import { SPRITE_SIZE, toolSprites } from '../data/toolSprites';
import PixelSprite from './PixelSprite';

export default function ToolImage({
  toolId,
  className,
}: {
  toolId: string;
  className?: string;
}) {
  const sprite = toolSprites[toolId];

  if (!sprite) {
    return <PixelSprite className={className} art={toolArt[toolId]!} />;
  }

  return (
    <picture>
      <source
        srcSet={`/sprites/${sprite}.png`}
        media="(prefers-reduced-motion: reduce)"
      />
      <img
        className={className}
        src={`/sprites/${sprite}.gif`}
        width={SPRITE_SIZE}
        height={SPRITE_SIZE}
        alt=""
      />
    </picture>
  );
}
