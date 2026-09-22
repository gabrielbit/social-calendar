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
import { useRouter } from "next/navigation";
import { clientApiPut } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useEventDetailClose, useEventDetailNavigateAway } from "@/components/events/EventDetailDialog";

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
  leaveHref?: string | null;
  leaveLabel?: string;
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
  leaveHref,
  leaveLabel = "Volver",
  className,
}: EventActionsProps) {
  const close = useEventDetailClose();
  const navigateAway = useEventDetailNavigateAway();
  const router = useRouter();
  const [rsvp, setRsvp] = useState<"going" | "not_going" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
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
    setNeedsLogin(false);
    startTransition(async () => {
      try {
        await clientApiPut("/rsvp", {
          occurrenceId,
          status,
          profileVisible: true,
          ticketStatus: "no_aplica",
        });
        setRsvp(status);
      } catch (e) {
        const message = e instanceof Error ? e.message : "No se pudo guardar el RSVP";
        const needsLogin =
          /missing bearer|invalid or expired|unauthorized|iniciá sesión/i.test(message);
        setError(needsLogin ? "Tenés que iniciar sesión para marcar Voy." : message);
        setNeedsLogin(needsLogin);
      }
    });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-2">
        {leaveHref ? (
          <button
            type="button"
            onClick={() => {
              if (navigateAway) navigateAway(leaveHref);
              else router.replace(leaveHref);
            }}
            className="btn-secondary text-sm"
          >
            {leaveLabel}
          </button>
        ) : null}
        {close ? (
          <button type="button" onClick={close} className="btn-secondary text-sm">
            Cerrar
          </button>
        ) : null}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm"
        >
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </a>
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
          <CalendarPlus className="size-4" aria-hidden />
          Google
        </a>
        <button type="button" onClick={downloadIcs} className="btn-secondary text-sm">
          <Download className="size-4" aria-hidden />
          ICS
        </button>
        {canonicalPath && (
          <Link href={canonicalPath} className="btn-secondary text-sm">
            <ExternalLink className="size-4" aria-hidden />
            Enlace canónico
          </Link>
        )}
      </div>

      {showRsvp && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium text-ink">¿Vas a ir?</p>
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
              <ThumbsUp className="size-4" aria-hidden />
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
              <ThumbsDown className="size-4" aria-hidden />
              No voy
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400" role="alert">
              {error}
              {needsLogin ? (
                <>
                  {" "}
                  <Link href="/auth/login" className="underline">
                    Iniciá sesión
                  </Link>
                </>
              ) : null}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
