export const SPRITE_SIZE = 128;

export interface ToolSprite {
  file: string;
  stillFile?: string;
}

const animated = (name: string): ToolSprite => ({
  file: `${name}.gif`,
  stillFile: `${name}.png`,
});

// Creatures come from the official Tibia Fankit and icons from TibiaWiki. Both
// are copyrighted by CipSoft. Removing an entry brings back the original
// drawing from toolArt, in case CipSoft objects.
export const toolSprites: Record<string, ToolSprite> = {
  charms: { file: 'major-charms.webp' },
  monsters: animated('dragon'),
  bestiary: animated('bonelord'),
  exercise: { file: 'exercise-sword.webp' },
  imbuements: { file: 'vampirism.webp' },
  'hunting-places': animated('cyclops'),
};
