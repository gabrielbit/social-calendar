"use client";

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

const POSITIONS = [
  { top: "12%", left: "18%", size: "md", delay: "0s" },
  { top: "28%", left: "72%", size: "lg", delay: "0.8s" },
  { top: "55%", left: "12%", size: "sm", delay: "1.2s" },
  { top: "48%", left: "45%", size: "md", delay: "0.4s" },
  { top: "68%", left: "78%", size: "sm", delay: "1.6s" },
  { top: "22%", left: "48%", size: "sm", delay: "2s" },
  { top: "78%", left: "35%", size: "md", delay: "0.6s" },
  { top: "38%", left: "88%", size: "sm", delay: "1.4s" },
];

export function Constellation({ nodes }: ConstellationProps) {
  const items = nodes.slice(0, POSITIONS.length);

  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface"
      role="list"
      aria-label="Red de tags y promotores destacados"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-border"
        aria-hidden
      >
        <line x1="18%" y1="12%" x2="48%" y2="22%" stroke="currentColor" strokeWidth="1" />
        <line x1="48%" y1="22%" x2="72%" y2="28%" stroke="currentColor" strokeWidth="1" />
        <line x1="45%" y1="48%" x2="72%" y2="28%" stroke="currentColor" strokeWidth="1" />
        <line x1="12%" y1="55%" x2="45%" y2="48%" stroke="currentColor" strokeWidth="1" />
        <line x1="45%" y1="48%" x2="78%" y2="68%" stroke="currentColor" strokeWidth="1" />
        <line x1="35%" y1="78%" x2="45%" y2="48%" stroke="currentColor" strokeWidth="1" />
      </svg>

      {items.map((node, i) => {
        const pos = POSITIONS[i]!;
        const href =
          node.kind === "tag" ? `/explorar?tag=${node.slug}` : `/a/${node.slug}`;
        const sizeClass =
          pos.size === "lg"
            ? "h-16 w-16 text-xs"
            : pos.size === "md"
              ? "h-12 w-12 text-[10px]"
              : "h-9 w-9 text-[9px]";

        return (
          <Link
            key={`${node.kind}-${node.slug}`}
            href={href}
            role="listitem"
            className={cn(
              "constellation-node absolute flex items-center justify-center rounded-full border border-accent/30 bg-accent-soft font-medium text-accent transition-transform hover:scale-105 hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transform-none",
              sizeClass,
            )}
            style={{ top: pos.top, left: pos.left, animationDelay: pos.delay }}
            title={node.name}
          >
            <span className="line-clamp-2 px-1 text-center leading-tight">{node.name}</span>
          </Link>
        );
      })}

      <style jsx>{`
        .constellation-node {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .constellation-node {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
