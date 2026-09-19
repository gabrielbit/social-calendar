"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  Download,
  ExternalLink,
  MessageCircle,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import {
  buildGoogleCalendarUrl,
  buildIcs,
  buildWhatsAppShareUrl,
  type CalendarEventPayload,
} from "@agenda/domain";
import { formatEventDate, formatEventTime, appUrl } from "@/lib/dates";
import { clientApiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type EventActionsProps = {
  occurrenceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  timezone: string;
  description?: string | null;
  location?: string | null;
  canonicalPath?: string;
  showRsvp?: boolean;
  className?: string;
};

export function EventActions({
  occurrenceId,
  title,
  startsAt,
  endsAt,
  allDay,
  timezone,
  description,
  location,
  canonicalPath,
  showRsvp = true,
  className,
}: EventActionsProps) {
  const [rsvp, setRsvp] = useState<"going" | "not_going" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canonical = canonicalPath ?? `/e/${occurrenceId}`;
  const eventUrl = appUrl(canonical);
  const dateLabel = formatEventDate(startsAt, timezone, allDay);
  const timeLabel = formatEventTime(startsAt, endsAt, timezone, allDay);

  const calendarPayload: CalendarEventPayload = {
    title,
    description: description ?? undefined,
    location: location ?? undefined,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    allDay,
    timezone,
    url: eventUrl,
  };

  const googleUrl = buildGoogleCalendarUrl(calendarPayload);
  const whatsappUrl = buildWhatsAppShareUrl({
    name: title,
    dateLabel,
    timeLabel,
    url: eventUrl,
  });

  function downloadIcs() {
    const ics = buildIcs(calendarPayload, `${occurrenceId}@agenda-comunidad`);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").slice(0, 40)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRsvp(status: "going" | "not_going") {
    setError(null);
    startTransition(async () => {
      try {
        await clientApiPost("/rsvps", {
          occurrenceId,
          status,
          profileVisible: true,
          ticketStatus: "no_aplica",
        });
        setRsvp(status);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar el RSVP");
      }
    });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          WhatsApp
        </a>
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Google
        </a>
        <button type="button" onClick={downloadIcs} className="btn-secondary text-sm">
          <Download className="h-4 w-4" aria-hidden />
          ICS
        </button>
        {canonicalPath && (
          <Link href={canonicalPath} className="btn-secondary text-sm">
            <ExternalLink className="h-4 w-4" aria-hidden />
            Enlace canónico
          </Link>
        )}
      </div>

      {showRsvp && (
        <div className="rounded-lg border border-border bg-canvas p-3">
          <p className="mb-2 text-sm font-medium text-ink">¿Vas a ir?</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => handleRsvp("going")}
              className={cn(
                "btn-secondary flex-1 text-sm",
                rsvp === "going" && "border-accent bg-accent-soft text-accent",
              )}
            >
              <ThumbsUp className="h-4 w-4" aria-hidden />
              Voy
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleRsvp("not_going")}
              className={cn(
                "btn-secondary flex-1 text-sm",
                rsvp === "not_going" && "border-ink-muted bg-canvas text-ink-muted",
              )}
            >
              <ThumbsDown className="h-4 w-4" aria-hidden />
              No voy
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}.{" "}
              <Link href="/auth/login" className="underline">
                Iniciá sesión
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
