"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { buildIcs, type CalendarEventPayload } from "@agenda/domain";
import { appUrl } from "@/lib/dates";

type ShareEvent = {
  occurrenceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  timezone: string;
};

type ShareBarProps = {
  title: string;
  path: string;
  events: ShareEvent[];
};

export function ShareBar({ title, path, events }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = appUrl(path);
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  function downloadIcs() {
    if (events.length === 0) return;
    const vevents = events.map((event) => {
      const payload: CalendarEventPayload = {
        title: event.title,
        startsAt: new Date(event.startsAt),
        endsAt: new Date(event.endsAt),
        allDay: event.allDay,
        timezone: event.timezone,
        url: appUrl(`/e/${event.occurrenceId}`),
      };
      const ics = buildIcs(payload, `${event.occurrenceId}@agenda-comunidad`);
      return ics.match(/BEGIN:VEVENT[\s\S]*END:VEVENT/)?.[0] ?? "";
    });
    const body = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Agenda Comunidad//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...vevents.filter(Boolean),
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").slice(0, 40)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={share} className="btn-secondary">
        <Share2 className="size-4" aria-hidden />
        {copied ? "Copiado" : "Compartir"}
      </button>
      {events.length > 0 ? (
        <button type="button" onClick={downloadIcs} className="btn-secondary">
          <Download className="size-4" aria-hidden />
          ICS
        </button>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {copied ? "Enlace copiado" : ""}
      </span>
    </div>
  );
}