import { ART_SIZE, type PixelArt } from '../data/toolArt';

interface PixelRun {
  x: number;
  length: number;
  char: string;
}

// Joins equal neighbors so each row renders with as few rects as possible.
function getRuns(row: string): PixelRun[] {
  const runs: PixelRun[] = [];

  [...row].forEach((char, x) => {
    const previous = runs.at(-1);

    if (previous?.char === char) {
      previous.length += 1;
    } else {
      runs.push({ x, length: 1, char });
    }
  });

  return runs.filter((run) => run.char !== '.');
}

export default function PixelSprite({
  art,
  className,
}: {
  art: PixelArt;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {art.rows.flatMap((row, y) =>
        getRuns(row).map((run) => (
          <rect
            key={`${y}-${run.x}`}
            x={run.x}
            y={y}
            width={run.length}
            height={1}
            fill={art.palette[run.char]}
          />
        )),
      )}
    </svg>
  );
}
