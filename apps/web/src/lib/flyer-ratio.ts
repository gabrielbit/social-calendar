"use client";

import { useEffect, useState } from "react";

export const VERTICAL_RATIO = 1.08;

const ratioCache = new Map<string, number>();

function cacheRatio(src: string, width: number, height: number): number {
  const value = height / width;
  ratioCache.set(src, value);
  return value;
}

function probeSrc(src: string): string {
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=64&q=1`;
}

export function useFlyerRatio(src: string | undefined): number | null {
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
    const apply = (width: number, height: number) => {
      if (!active || !width) return;
      setRatio(cacheRatio(src, width, height));
    };

    const img = new window.Image();
    img.onload = () => apply(img.naturalWidth, img.naturalHeight);
    img.onerror = () => {
      if (!active) return;
      const original = new window.Image();
      original.onload = () => apply(original.naturalWidth, original.naturalHeight);
      original.src = src;
    };
    img.src = probeSrc(src);

    return () => {
      active = false;
    };
  }, [src]);

  return ratio;
}
