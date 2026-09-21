"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Send, X } from "lucide-react";
import type { AgentEventDraft } from "@agenda/domain";
import { AgentMark } from "@/components/agent/AgentMark";
import { clientApiGet, clientApiPost } from "@/lib/api-client";
import { formatEventDate, formatEventTime } from "@/lib/dates";
import {
  imageFromClipboard,
  MAX_EVENT_IMAGES,
  uploadEventImage,
} from "@/lib/media";
import { cn } from "@/lib/utils";

type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrls: string[];
  draft: AgentEventDraft | null;
  createdOccurrenceId: string | null;
  createdAt: string;
};

type AgentPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function AgentPanel({ open, onClose }: AgentPanelProps) {
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [text, setText] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    void (async () => {
      try {
        const { thread } = await clientApiGet<{
          thread: { id: string; messages: AgentMessage[] } | null;
        }>("/agent/thread");
        if (cancelled) return;
        if (thread) {
          setThreadId(thread.id);
          setMessages(thread.messages);
        }
        setLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el chat");
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const addFiles = useCallback(async (files: File[]) => {
    const incoming = files.filter((file) => file.type.startsWith("image/"));
    if (incoming.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of incoming.slice(0, MAX_EVENT_IMAGES)) {
        uploaded.push(await uploadEventImage(file));
      }
      setPendingImages((current) => [...current, ...uploaded].slice(0, MAX_EVENT_IMAGES));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePaste(event: ClipboardEvent) {
      const file = imageFromClipboard(event);
      if (file) {
        event.preventDefault();
        void addFiles([file]);
        return;
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open, addFiles]);

  async function send() {
    const trimmed = text.trim();
    if ((!trimmed && pendingImages.length === 0) || loading || uploading) return;

    setError(null);
    setLoading(true);
    const optimistic: AgentMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed || "(imagen)",
      imageUrls: pendingImages,
      draft: null,
      createdOccurrenceId: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setText("");
    const images = pendingImages;
    setPendingImages([]);

    try {
      const result = await clientApiPost<{
        threadId: string;
        message: AgentMessage;
      }>("/agent/turns", {
        text: trimmed,
        imageUrls: images,
        threadId: threadId ?? undefined,
      });
      setThreadId(result.threadId);
      setMessages((current) => [...current.filter((m) => m.id !== optimistic.id), optimistic, result.message]);
    } catch (err) {
      setMessages((current) => current.filter((m) => m.id !== optimistic.id));
      setText(trimmed);
      setPendingImages(images);
      setError(err instanceof Error ? err.message : "No se pudo hablar con el asistente");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function createFromDraft(message: AgentMessage) {
    if (!message.draft || creatingId) return;
    setCreatingId(message.id);
    setError(null);
    try {
      const result = await clientApiPost<{
        event: { id: string };
        occurrences: { id: string }[];
      }>("/agent/create-event", {
        messageId: message.id,
        draft: message.draft,
      });
      const occurrenceId = result.occurrences[0]?.id;
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, createdOccurrenceId: occurrenceId ?? item.createdOccurrenceId }
            : item,
        ),
      );
      if (occurrenceId) {
        onClose();
        router.push(`/e/${occurrenceId}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el evento");
    } finally {
      setCreatingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-nav flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar asistente"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-dvh w-full max-w-md flex-col border-l border-border bg-canvas shadow-ds-lg"
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <AgentMark size="sm" />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-sm font-medium text-ink">
              Asistente
            </h2>
            <p className="truncate text-xs text-ink-muted">Pegá un flyer o texto y creo el evento</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-muted hover:bg-white/[0.04] hover:text-ink"
            aria-label="Cerrar"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-agent/30 bg-agent-soft p-4">
              <div className="flex items-center gap-2">
                <AgentMark size="sm" />
                <p className="text-sm font-medium text-ink">Listo para dar de alta</p>
              </div>
              <p className="mt-2 text-pretty text-sm text-ink-muted">
                Pegá texto de Instagram, un mail o una imagen del flyer. Revisás el borrador y lo
                publicamos con un clic.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex flex-col gap-2", message.role === "user" ? "items-end" : "items-start")}
            >
              {message.role === "assistant" && <AgentMark size="sm" />}
              <div
                className={cn(
                  "max-w-[92%] rounded-2xl px-3 py-2 text-sm text-pretty",
                  message.role === "user"
                    ? "bg-surface text-ink"
                    : "border border-agent/25 bg-agent-soft text-ink",
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.imageUrls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.imageUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              {message.draft && (
                <div className="w-full max-w-[92%] rounded-2xl border border-agent/40 bg-surface p-3">
                  <div className="flex items-start gap-2">
                    <AgentMark size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink text-balance">{message.draft.title}</p>
                      <p className="mt-1 text-xs text-ink-muted tabular-nums">
                        {formatEventDate(message.draft.startsAt, message.draft.timezone, message.draft.allDay)}
                        {!message.draft.allDay &&
                          ` · ${formatEventTime(
                            message.draft.startsAt,
                            message.draft.endsAt,
                            message.draft.timezone,
                            message.draft.allDay,
                          )}`}
                      </p>
                      {message.draft.locationLabel && (
                        <p className="mt-1 truncate text-xs text-ink-muted">{message.draft.locationLabel}</p>
                      )}
                      {message.draft.priceLabel && (
                        <p className="mt-1 text-xs text-ink-muted">{message.draft.priceLabel}</p>
                      )}
                      {message.draft.isFree && (
                        <p className="mt-1 text-xs text-ink-muted">Entrada gratis</p>
                      )}
                    </div>
                  </div>
                  {(message.draft.coverImageUrl || message.draft.galleryUrls?.[0]) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.draft.coverImageUrl ?? message.draft.galleryUrls[0]}
                      alt=""
                      className="mt-3 h-28 w-full rounded-xl object-cover"
                    />
                  )}
                  {message.createdOccurrenceId ? (
                    <p className="mt-3 text-xs text-emerald-400">Evento creado</p>
                  ) : (
                    <button
                      type="button"
                      disabled={creatingId === message.id}
                      onClick={() => void createFromDraft(message)}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-agent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-agent-hover disabled:opacity-50"
                    >
                      {creatingId === message.id ? "Creando…" : "Crear evento"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && (
            <p className="mb-2 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          {pendingImages.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingImages.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-canvas p-0.5 text-ink"
                    aria-label="Quitar imagen"
                    onClick={() => setPendingImages((current) => current.filter((item) => item !== url))}
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                void addFiles(files);
              }}
            />
            <button
              type="button"
              className="rounded-xl border border-border p-2.5 text-ink-muted hover:border-agent/40 hover:text-agent"
              aria-label="Adjuntar imagen"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="size-4" aria-hidden />
            </button>
            <textarea
              ref={inputRef}
              rows={2}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Pegá el flyer o contame el evento…"
              className="input-field min-h-[44px] flex-1 resize-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || uploading || (!text.trim() && pendingImages.length === 0)}
              className="rounded-xl bg-agent p-2.5 text-white hover:bg-agent-hover disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
