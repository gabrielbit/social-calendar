"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight, Expand, Images, X } from "lucide-react";
import { cn } from "@/lib/utils";

const VERTICAL_RATIO = 1.08;

const ratioCache = new Map<string, number>();

function cacheRatio(src: string, width: number, height: number): number {
  const value = height / width;
  ratioCache.set(src, value);
  return value;
}

function useFlyerRatio(src: string | undefined): number | null {
  const [ratio, setRatio] = useState<number | null>(() =>
    src ? (ratioCache.get(src) ?? null) : null,
  );

  useEffect(() => {
    if (!src) {
      setRatio(null);
      return;
    }
    const cached = ratioCache.get(src);
    if (cached != null) {
      setRatio(cached);
      return;
    }

    let active = true;
    const img = new window.Image();
    img.onload = () => {
      if (!active || !img.naturalWidth) return;
      setRatio(cacheRatio(src, img.naturalWidth, img.naturalHeight));
    };
    img.src = src;
    return () => {
      active = false;
    };
  }, [src]);

  return ratio;
}

/** Textura estable derivada del título, para eventos sin flyer. */
function textureFor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);
  const angle = hash % 180;
  const band = 8 + (hash % 16);
  const ramp = ["#2b2741", "#423a6a", "#5d5294", "#796cbf"];
  const from = ramp[hash % ramp.length];
  const to = ramp[(hash + 2) % ramp.length];
  return `repeating-linear-gradient(${angle}deg, ${from} 0 ${band}px, ${to} ${band}px ${band * 2}px)`;
}

type EventFlyerProps = {
  images: string[];
  title: string;
  children: ReactNode;
};

export function EventFlyer({ images, title, children }: EventFlyerProps) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const cover = images[0];
  const probed = useFlyerRatio(cover);
  const [loadedRatio, setLoadedRatio] = useState<number | null>(null);
  const ratio = probed ?? loadedRatio;

  const hasImages = images.length > 0;
  const multiple = images.length > 1;
  const vertical = ratio !== null && ratio > VERTICAL_RATIO;
  const current = images[Math.min(index, images.length - 1)];

  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );

  useEffect(() => {
    if (!zoomed) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomed(false);
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomed, next, prev]);

  const counter = `${Math.min(index, images.length - 1) + 1} / ${images.length}`;

  const media = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-surface",
        vertical
          ? "h-[240px] w-full md:h-auto md:min-h-[420px] md:w-[320px] md:self-stretch"
          : "h-[210px] w-full",
      )}
      style={hasImages ? undefined : { backgroundImage: textureFor(title) }}
    >
      {current ? (
        <Image
          src={current}
          alt=""
          fill
          priority
          className="object-cover object-[center_22%]"
          sizes={vertical ? "(max-width: 768px) 100vw, 320px" : "(max-width: 768px) 100vw, 520px"}
          onLoad={(event) => {
            if (current !== cover) return;
            const img = event.currentTarget;
            if (!img.naturalWidth) return;
            setLoadedRatio(cacheRatio(cover, img.naturalWidth, img.naturalHeight));
          }}
        />
      ) : null}

      {hasImages ? (
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="group absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <span className="sr-only">Ver flyer completo de {title}</span>
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#0a0b12]/72 px-2.5 py-1 text-[11.5px] text-neutral-200">
            <Expand className="size-3.5" aria-hidden />
            Ver flyer completo
          </span>
        </button>
      ) : null}

      {multiple ? (
        <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#0a0b12]/72 px-2.5 py-0.5 text-[11px] tabular-nums text-neutral-200">
          <Images className="size-3" aria-hidden />
          {counter}
        </span>
      ) : null}
    </div>
  );

  return (
    <>
      <article
        className={cn(
          "mx-auto flex max-h-[calc(100dvh-48px)] w-full overflow-hidden rounded-[14px] bg-surface shadow-ds-md",
          vertical ? "max-w-[880px] flex-col md:flex-row" : "max-w-[520px] flex-col",
        )}
      >
        {media}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto p-3 [&>*]:shrink-0">
          {children}
        </div>
      </article>

      {zoomed && current ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Flyer de ${title}`}
          className="fixed inset-0 z-overlay grid place-items-center bg-neutral-900/50 p-4"
          onClick={() => setZoomed(false)}
        >
          <div
            className="flex w-full max-w-[720px] flex-col gap-3 rounded-[14px] bg-surface p-4 shadow-ds-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setZoomed(false)}
                className="btn-secondary text-[13px]"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Volver al evento
              </button>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-neutral-500">{title}</span>
              {multiple ? (
                <span className="text-xs tabular-nums text-neutral-400">{counter}</span>
              ) : null}
              <button
                type="button"
                onClick={() => setZoomed(false)}
                className="btn-ghost-cal"
                aria-label="Cerrar"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="relative flex items-center justify-center rounded-lg bg-canvas p-2.5">
              <div className="relative h-[70vh] w-full">
                <Image src={current} alt={title} fill className="object-contain" sizes="100vw" />
              </div>
              {multiple ? (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Imagen anterior"
                    className="btn-secondary absolute left-3.5 top-1/2 size-9 -translate-y-1/2 rounded-full bg-canvas/80 p-0"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Imagen siguiente"
                    className="btn-secondary absolute right-3.5 top-1/2 size-9 -translate-y-1/2 rounded-full bg-canvas/80 p-0"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                </>
              ) : null}
            </div>

            {multiple ? (
              <div className="flex justify-center gap-[7px]">
                {images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    className={cn(
                      "relative size-[52px] overflow-hidden rounded border",
                      i === index ? "border-accent opacity-100" : "border-divider opacity-55",
                    )}
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="52px" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
