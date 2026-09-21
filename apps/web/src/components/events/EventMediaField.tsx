"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  imageFromClipboard,
  MAX_EVENT_IMAGES,
  uploadEventImage,
} from "@/lib/media";

type EventMediaFieldProps = {
  images: string[];
  onChange: (images: string[]) => void;
  onError?: (message: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
};

export function EventMediaField({ images, onChange, onError, onBusyChange }: EventMediaFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const imagesRef = useRef(images);
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  const onBusyRef = useRef(onBusyChange);
  imagesRef.current = images;
  onChangeRef.current = onChange;
  onErrorRef.current = onError;
  onBusyRef.current = onBusyChange;

  function setBusyState(next: boolean) {
    setBusy(next);
    onBusyRef.current?.(next);
  }

  async function addFiles(files: File[]) {
    const incoming = files.filter((file) => file.type.startsWith("image/"));
    if (incoming.length === 0) return;

    const remaining = MAX_EVENT_IMAGES - imagesRef.current.length;
    if (remaining <= 0) {
      onErrorRef.current?.(`Podés sumar hasta ${MAX_EVENT_IMAGES} imágenes`);
      return;
    }

    onErrorRef.current?.(null);
    setBusyState(true);
    try {
      const uploaded: string[] = [];
      for (const file of incoming.slice(0, remaining)) {
        uploaded.push(await uploadEventImage(file));
      }
      onChangeRef.current([...imagesRef.current, ...uploaded]);
    } catch (err) {
      onErrorRef.current?.(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setBusyState(false);
    }
  }

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const file = imageFromClipboard(event);
      if (!file) return;
      event.preventDefault();
      void addFiles([file]);
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink-muted">Imágenes</p>
        <p className="text-xs text-ink-faint">Pegá con ⌘V o elegí un archivo</p>
      </div>

      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((src, index) => (
            <li key={src} className="relative overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
              <p className="absolute left-2 top-2 rounded-full bg-canvas/80 px-2 py-0.5 text-[11px] text-ink">
                {index === 0 ? "Principal" : `${index + 1}`}
              </p>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-2 top-2 rounded-full border border-border bg-canvas/90 p-1 text-ink"
                aria-label="Quitar imagen"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {images.length < MAX_EVENT_IMAGES ? (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted hover:border-accent/40 hover:text-ink"
        >
          <ImagePlus className="size-5" aria-hidden />
          <span className="text-pretty">
            {images.length === 0
              ? "La primera imagen es la de portada. Después, ⌘V suma otra."
              : "Sumá otra imagen"}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const list = Array.from(event.target.files ?? []);
              event.target.value = "";
              void addFiles(list);
            }}
          />
        </label>
      ) : null}

      {busy ? <p className="text-xs text-ink-faint">Subiendo…</p> : null}
    </div>
  );
}
