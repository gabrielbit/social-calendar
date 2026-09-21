"use client";

import { useId, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDateTimeLabel(value: Date, allDay: boolean): string {
  const raw = allDay
    ? format(value, "EEEE d 'de' MMMM", { locale: es })
    : format(value, "EEEE d 'de' MMMM · HH:mm", { locale: es });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type EventDateTimePickerProps = {
  id: string;
  label: string;
  value: Date;
  allDay?: boolean;
  onChange: (next: Date) => void;
};

export function EventDateTimePicker({
  id,
  label,
  value,
  allDay = false,
  onChange,
}: EventDateTimePickerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(value);
  const [viewMonth, setViewMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const display = formatDateTimeLabel(value, allDay);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  });

  const minuteOptions = MINUTES.includes(draft.getMinutes())
    ? MINUTES
    : [...MINUTES, draft.getMinutes()].sort((a, b) => a - b);

  function open() {
    setDraft(new Date(value.getTime()));
    setViewMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function confirm() {
    onChange(new Date(draft.getTime()));
    close();
  }

  function pickDay(day: Date) {
    setDraft((current) => {
      const next = new Date(current);
      next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
      return next;
    });
  }

  function setHour(hours: number) {
    setDraft((current) => {
      const next = new Date(current);
      next.setHours(hours);
      return next;
    });
  }

  function setMinute(minutes: number) {
    setDraft((current) => {
      const next = new Date(current);
      next.setMinutes(minutes, 0, 0);
      return next;
    });
  }

  const monthLabel = format(viewMonth, "MMMM yyyy", { locale: es });

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-sm text-ink-muted">
        {label}
      </p>
      <button
        id={id}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label={`${label}: ${display}`}
        className="input-field flex w-full items-center justify-between text-left tabular-nums"
      >
        <span>{display}</span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="event-datetime-dialog z-overlay w-[min(calc(100vw-2rem),22rem)] text-ink shadow-none"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const inside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
          if (!inside) close();
        }}
      >
        <p id={titleId} className="mb-3 text-sm font-medium text-ink">
          {label}
        </p>
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="btn-ghost-cal"
            aria-label="Mes anterior"
            onClick={() => setViewMonth((month) => addMonths(month, -1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <p className="text-sm capitalize text-ink">{monthLabel}</p>
          <button
            type="button"
            className="btn-ghost-cal"
            aria-label="Mes siguiente"
            onClick={() => setViewMonth((month) => addMonths(month, 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-ink-faint">
          {WEEKDAYS.map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm tabular-nums">
          {days.map((day) => {
            const selected = isSameDay(day, draft);
            const inMonth = isSameMonth(day, viewMonth);
            const today = isSameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => pickDay(day)}
                aria-pressed={selected}
                aria-label={format(day, "d 'de' MMMM yyyy", { locale: es })}
                className={cn(
                  "mx-auto flex size-8 items-center justify-center rounded-full",
                  !inMonth && "text-ink-faint/40",
                  inMonth && "text-ink-muted hover:bg-white/[0.05] hover:text-ink",
                  today && !selected && "ring-1 ring-accent/50",
                  selected && "bg-accent text-canvas hover:bg-accent hover:text-canvas",
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
        {!allDay ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-ink-muted">Hora</span>
              <select
                className="input-field mt-1 tabular-nums"
                value={draft.getHours()}
                onChange={(event) => setHour(Number(event.target.value))}
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Minutos</span>
              <select
                className="input-field mt-1 tabular-nums"
                value={draft.getMinutes()}
                onChange={(event) => setMinute(Number(event.target.value))}
              >
                {minuteOptions.map((minute) => (
                  <option key={minute} value={minute}>
                    {String(minute).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        <p className="mt-4 text-sm tabular-nums text-ink-muted">{formatDateTimeLabel(draft, allDay)}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={close}>
            Cancelar
          </button>
          <button type="button" className="btn-primary flex-1" onClick={confirm}>
            Listo
          </button>
        </div>
      </dialog>
    </div>
  );
}
