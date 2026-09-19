"use client";

import { useMemo } from "react";
import "@fullcalendar/core/index.css";
import "@fullcalendar/daygrid/index.css";
import "@fullcalendar/timegrid/index.css";
import "@fullcalendar/list/index.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";
import { useRouter } from "next/navigation";
import type { AgendaOccurrence } from "@/lib/types";

type AgendaCalendarProps = {
  occurrences: AgendaOccurrence[];
  agendaSlug: string;
};

export function AgendaCalendar({ occurrences, agendaSlug }: AgendaCalendarProps) {
  const router = useRouter();

  const events = useMemo(
    () =>
      occurrences.map((o) => ({
        id: o.occurrence_id,
        title: o.title,
        start: o.starts_at,
        end: o.ends_at,
        allDay: o.all_day,
        extendedProps: {
          attribution: o.original_promoter_name,
          inclusionReason: o.inclusion_reason,
        },
      })),
    [occurrences],
  );

  return (
    <div className="hidden md:block">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
        initialView="dayGridMonth"
        locale="es"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        height="auto"
        events={events}
        eventClick={(info) => {
          router.push(`/a/${agendaSlug}/e/${info.event.id}`);
        }}
        eventDidMount={(info) => {
          const attribution = info.event.extendedProps.attribution as string | undefined;
          if (attribution && attribution !== info.event.title) {
            info.el.setAttribute("title", `${info.event.title} · ${attribution}`);
          }
        }}
      />
    </div>
  );
}
