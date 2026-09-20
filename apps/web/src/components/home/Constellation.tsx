import Link from "next/link";
import { cn } from "@/lib/utils";

type Node = {
  slug: string;
  name: string;
  kind: "tag" | "promoter";
};

type ConstellationProps = {
  nodes: Node[];
};

const STARS = [
  { x: 18, y: 26, r: 5, label: "right" as const },
  { x: 34, y: 16, r: 3.5, label: "right" as const },
  { x: 52, y: 28, r: 6, label: "right" as const },
  { x: 72, y: 18, r: 4, label: "left" as const },
  { x: 44, y: 48, r: 7, label: "right" as const },
  { x: 22, y: 62, r: 4, label: "right" as const },
  { x: 58, y: 68, r: 5, label: "left" as const },
  { x: 78, y: 52, r: 3.5, label: "left" as const },
];

const LINES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 4],
  [2, 4],
  [3, 7],
  [4, 5],
  [4, 6],
  [5, 6],
  [6, 7],
];

const DUST = [
  { x: 8, y: 12, d: "0s" },
  { x: 14, y: 44, d: "1.2s" },
  { x: 6, y: 78, d: "2s" },
  { x: 28, y: 8, d: "0.6s" },
  { x: 41, y: 6, d: "1.8s" },
  { x: 63, y: 10, d: "0.3s" },
  { x: 88, y: 14, d: "2.4s" },
  { x: 92, y: 36, d: "0.9s" },
  { x: 86, y: 72, d: "1.5s" },
  { x: 95, y: 88, d: "0.1s" },
  { x: 48, y: 88, d: "2.2s" },
  { x: 12, y: 92, d: "1s" },
  { x: 38, y: 36, d: "0.5s" },
  { x: 66, y: 40, d: "1.7s" },
  { x: 80, y: 32, d: "2.6s" },
  { x: 16, y: 48, d: "0.8s" },
  { x: 70, y: 78, d: "1.3s" },
  { x: 36, y: 80, d: "2.1s" },
  { x: 54, y: 8, d: "0.4s" },
  { x: 90, y: 58, d: "1.9s" },
  { x: 4, y: 30, d: "1.1s" },
  { x: 60, y: 90, d: "0.2s" },
];

export function Constellation({ nodes }: ConstellationProps) {
  const items = nodes.slice(0, STARS.length);

  return (
    <div
      className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-border bg-canvas sm:aspect-[16/10]"
      role="list"
      aria-label="Red de tags y promotores destacados"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(155,135,245,0.16),transparent_58%)]"
        aria-hidden
      />

      {DUST.map((star, i) => (
        <span
          key={`dust-${i}`}
          className="star-dust pointer-events-none absolute size-px rounded-full bg-ink"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            animationDelay: star.d,
          }}
          aria-hidden
        />
      ))}

      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        {LINES.map(([a, b]) => {
          const from = STARS[a];
          const to = STARS[b];
          if (!from || !to) return null;
          return (
            <line
              key={`${a}-${b}`}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              stroke="rgba(155, 135, 245, 0.32)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {items.map((node, i) => {
        const star = STARS[i]!;
        const href = node.kind === "tag" ? `/explorar?tag=${node.slug}` : `/a/${node.slug}`;
        const labelLeft = star.label === "left";

        return (
          <Link
            key={`${node.kind}-${node.slug}`}
            href={href}
            role="listitem"
            className="group absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: `${star.x}%`, top: `${star.y}%` }}
            aria-label={node.name}
          >
            <span
              className="rounded-full bg-ink transition-transform duration-200 ease-out group-hover:scale-125 group-focus-visible:scale-125 motion-reduce:transform-none"
              style={{ width: star.r, height: star.r }}
            />
            <span
              className={cn(
                "absolute top-1/2 max-w-[9rem] -translate-y-1/2 truncate text-sm text-ink-muted transition-colors duration-200 ease-out group-hover:text-ink group-focus-visible:text-ink",
                labelLeft ? "right-[calc(100%+0.6rem)]" : "left-[calc(100%+0.6rem)]",
              )}
            >
              {node.name}
            </span>
          </Link>
        );
      })}

      <p className="pointer-events-none absolute bottom-4 left-4 text-[11px] text-ink-faint">
        Constelación de la red
      </p>
    </div>
  );
}
