"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDays, addMonths, eachDayOfInterval, isSameMonth } from "date-fns";
import {
  Cake,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Rss,
  Search,
} from "lucide-react";
import { EventTile } from "@/components/calendar/EventTile";
import { DaySearchPanel } from "@/components/calendar/DaySearchPanel";
import { EventDetailOverlay } from "@/components/events/EventDetailOverlay";
import { GoogleCalendarIcon } from "@/components/icons/GoogleCalendarIcon";
import {
  birthdayMatchesDay,
  eventDayKey,
  formatEventClock,
  formatMonthLabel,
  formatWeekdayLong,
  formatWeekdayShort,
  formatWeekLabel,
  nameInitials,
  startOfMonthZoned,
  startOfWeekMonday,
  weekDaysFrom,
  zonedDayKey,
} from "@/lib/dates";
import type { HomeCalendarData, HomeCalendarEvent, HomePersonalEvent, NetworkBirthday } from "@/lib/types";
import { cn } from "@/lib/utils";

const LAYERS = [
  { key: "siguiendo", label: "Siguiendo", icon: Rss },
  { key: "voy", label: "Voy", icon: CheckCircle2 },
  { key: "personal", label: "Personal", icon: Lock },
  { key: "fechas", label: "Fechas de mi red", icon: Cake },
] as const;

type LayerKey = (typeof LAYERS)[number]["key"];
type CalMode = "semana" | "mes";
type LayerState = Record<LayerKey, boolean>;

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

type HomeCalendarProps = HomeCalendarData;

type DayModel = {
  key: string;
  date: Date;
  num: string;
  weekday: string;
  weekdayShort: string;
  inMonth: boolean;
  events: HomeCalendarEvent[];
  slots: { time: string; events: HomeCalendarEvent[] }[];
  personal: HomePersonalEvent[];
  birthdays: NetworkBirthday[];
};

function slotsFor(events: HomeCalendarEvent[]) {
  const times: string[] = [];
  for (const event of events) {
    const time = formatEventClock(event.starts_at, event.timezone, event.all_day);
    if (!times.includes(time)) times.push(time);
  }
  return times.map((time) => ({
    time,
    events: events.filter(
      (event) => formatEventClock(event.starts_at, event.timezone, event.all_day) === time,
    ),
  }));
}

export function HomeCalendar({ events, personal, birthdays, googleConnected }: HomeCalendarProps) {
  const [mode, setMode] = useState<CalMode>("semana");
  const [cursor, setCursor] = useState(() => new Date());
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [openOccurrenceId, setOpenOccurrenceId] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerState>({
    siguiendo: true,
    voy: true,
    personal: true,
    fechas: true,
  });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("e");
    if (id) setOpenOccurrenceId(id);
  }, []);

  const weekStart = useMemo(() => startOfWeekMonday(cursor), [cursor]);
  const monthStart = useMemo(() => startOfMonthZoned(cursor), [cursor]);
  const todayKey = zonedDayKey(new Date());

  const visibleEvents = useMemo(
    () =>
      events.filter((event) => (event.going ? layers.voy : layers.siguiendo)),
    [events, layers.siguiendo, layers.voy],
  );
  const visiblePersonal = layers.personal ? personal : [];
  const visibleBirthdays = layers.fechas ? birthdays : [];

  const weekDays = useMemo(() => {
    return weekDaysFrom(weekStart).map((date) => buildDay(date, monthStart, true, visibleEvents, visiblePersonal, visibleBirthdays));
  }, [weekStart, monthStart, visibleEvents, visiblePersonal, visibleBirthdays]);

  const monthDays = useMemo(() => {
    const gridStart = startOfWeekMonday(monthStart);
    const gridEnd = addDays(startOfWeekMonday(addDays(addMonths(monthStart, 1), -1)), 6);
    return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) =>
      buildDay(date, monthStart, false, visibleEvents, visiblePersonal, visibleBirthdays),
    );
  }, [monthStart, visibleEvents, visiblePersonal, visibleBirthdays]);

  const label = mode === "mes" ? formatMonthLabel(monthStart) : formatWeekLabel(weekStart);

  function goToday() {
    setCursor(new Date());
    setFocusDay(null);
  }

  function goPrev() {
    setCursor((current) => (mode === "mes" ? addMonths(current, -1) : addDays(startOfWeekMonday(current), -7)));
    setFocusDay(null);
  }

  function goNext() {
    setCursor((current) => (mode === "mes" ? addMonths(current, 1) : addDays(startOfWeekMonday(current), 7)));
    setFocusDay(null);
  }

  function toggleLayer(key: LayerKey) {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleFocus(dayKey: string) {
    setFocusDay((current) => (current === dayKey ? null : dayKey));
  }

  const weekCols = focusDay
    ? weekDays.map((day) => (day.key === focusDay ? "minmax(18rem,2.6fr)" : "minmax(9.5rem,0.85fr)")).join(" ")
    : "repeat(7, minmax(0, 1fr))";

  return (
    <>
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] flex-col px-3 pb-3 pt-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-2 px-0.5 pb-2">
        <button type="button" onClick={goPrev} className="btn-ghost-cal" aria-label="Anterior">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <p className="min-w-0 text-sm font-medium text-ink">{label}</p>
        <button type="button" onClick={goNext} className="btn-ghost-cal" aria-label="Siguiente">
          <ChevronRight className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={goToday} className="btn-ghost-cal text-xs">
          Hoy
        </button>
        <div className="seg ml-auto" role="radiogroup" aria-label="Vista de calendario">
          <ModeButton current={mode} value="semana" onSelect={setMode}>
            Semana
          </ModeButton>
          <ModeButton current={mode} value="mes" onSelect={setMode}>
            Mes
          </ModeButton>
          <Link href="/mi-agenda" className="seg-opt">
            Lista
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-0.5 pb-2">
        {LAYERS.map(({ key, label: layerLabel, icon: Icon }) => {
          const on = layers[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => toggleLayer(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                on
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-ink-faint hover:text-ink-muted",
              )}
            >
              <Icon className="size-3" aria-hidden />
              {layerLabel}
            </button>
          );
        })}
        {googleConnected ? (
          <span className="ml-auto text-[11px] text-ink-faint">Google Calendar conectado</span>
        ) : (
          <Link href="/settings" className="ml-auto inline-flex items-center gap-1 text-[11px] text-ink-faint hover:text-ink-muted">
            <GoogleCalendarIcon className="size-3.5" />
            Conectar Google Calendar
          </Link>
        )}
      </div>

      {mode === "semana" ? (
        <div className="cal-week min-h-0 flex-1 overflow-x-auto overflow-y-hidden" style={{ gridTemplateColumns: weekCols }}>
          {weekDays.map((day) => {
            const focused = focusDay === day.key;
            const compact = Boolean(focusDay) && !focused;
            const empty = day.slots.length === 0;
            const headColor =
              focused || day.key === todayKey
                ? "text-accent"
                : day.slots.length + day.personal.length + day.birthdays.length > 0
                  ? "text-ink"
                  : "text-ink-faint";

            return (
              <section key={day.key} className="flex min-w-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleFocus(day.key)}
                  className="flex items-baseline gap-1.5 px-0.5 text-left"
                  aria-expanded={focused}
                  aria-label={`${formatWeekdayLong(day.date)} ${day.num}`}
                >
                  <span className={cn("text-[17px] font-medium tabular-nums", headColor)}>{day.num}</span>
                  <span className="text-[11px] uppercase text-ink-faint">{day.weekday}</span>
                  {focused ? (
                    <span className="ml-auto text-[11px] text-accent">cerrar</span>
                  ) : (
                    <span className="ml-auto text-[11px] tabular-nums text-ink-faint">
                      {day.slots.reduce((count, slot) => count + slot.events.length, 0) || ""}
                    </span>
                  )}
                </button>

                {day.birthdays.map((birthday) => (
                  <div
                    key={birthday.profile_id}
                    className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1"
                  >
                    <Cake className="size-3 shrink-0 text-ink-faint" aria-hidden />
                    <span className="truncate text-[11px] text-ink-muted">
                      {nameInitials(birthday.display_name)} · {birthday.display_name}
                    </span>
                  </div>
                ))}

                {day.personal.map((item) => (
                  <Link
                    key={item.occurrence_id}
                    href={`/e/${item.occurrence_id}`}
                    className="flex items-center gap-1.5 rounded-md border-l-2 border-ink-faint bg-surface px-2 py-1"
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      setOpenOccurrenceId(item.occurrence_id);
                    }}
                  >
                    <Lock className="size-3 shrink-0 text-ink-faint" aria-hidden />
                    <span className="text-[11px] tabular-nums text-ink-muted">
                      {formatEventClock(item.starts_at, item.timezone, item.all_day)}
                    </span>
                    <span className="truncate text-[11px] text-ink">{item.title}</span>
                  </Link>
                ))}

                <div
                  className={cn(
                    "daybody flex min-h-0 flex-1 flex-col gap-1.5",
                    focused && "focusday",
                    compact && "compact",
                  )}
                >
                  {empty && !focused ? (
                    <button
                      type="button"
                      onClick={() => toggleFocus(day.key)}
                      className="emptyday flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3"
                    >
                      <span className="flex size-7 items-center justify-center rounded-full border border-border">
                        <Search className="size-3.5 text-ink-muted" aria-hidden />
                      </span>
                      <span className="text-center text-[11px] leading-snug text-ink-faint">
                        Nada agendado
                        <br />
                        Buscar planes para el {day.weekdayShort} {day.num}
                      </span>
                    </button>
                  ) : null}

                  {day.slots.map((slot) => (
                    <div key={slot.time} className="slot flex min-h-0 flex-none items-start gap-1.5">
                      {slot.events.map((event) => (
                        <EventTile
                          key={event.occurrence_id}
                          event={event}
                          compact={compact}
                          onOpen={setOpenOccurrenceId}
                        />
                      ))}
                    </div>
                  ))}

                  {focused ? (
                    <DaySearchPanel
                      dayKey={day.key}
                      label={`${day.weekdayShort} ${day.num}`}
                      fill={empty}
                    />
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-0.5 text-[10px] uppercase text-ink-faint">
                {day}
              </div>
            ))}
          </div>
          <div
            className="grid min-h-0 flex-1 grid-cols-7 gap-1.5"
            style={{ gridTemplateRows: `repeat(${Math.ceil(monthDays.length / 7)}, minmax(0, 1fr))` }}
          >
            {monthDays.map((day) => (
              <div
                key={day.key}
                className={cn(
                  "flex min-h-0 min-w-0 flex-col gap-0.5 rounded-md p-1",
                  day.key === todayKey && "bg-accent-soft",
                  !day.inMonth && "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "px-0.5 text-[11px] tabular-nums",
                    day.key === todayKey ? "text-accent" : "text-ink-muted",
                  )}
                >
                  {day.num}
                </span>
                <div className="flex min-h-0 flex-1 flex-col gap-0.5">
                  {day.slots.map((slot) => (
                    <div key={slot.time} className="flex min-h-0 flex-1 gap-0.5">
                      {slot.events.map((event) => (
                        <EventTile
                          key={event.occurrence_id}
                          event={event}
                          month
                          onOpen={setOpenOccurrenceId}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    {openOccurrenceId ? (
      <EventDetailOverlay
        occurrenceId={openOccurrenceId}
        onDismiss={() => setOpenOccurrenceId(null)}
      />
    ) : null}
    </>
  );
}

function ModeButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: CalMode;
  value: CalMode;
  onSelect: (value: CalMode) => void;
  children: React.ReactNode;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={cn("seg-opt", selected && "seg-opt-on")}
      onClick={() => onSelect(value)}
    >
      {children}
    </button>
  );
}

function buildDay(
  date: Date,
  monthStart: Date,
  longWeekday: boolean,
  events: HomeCalendarEvent[],
  personal: HomePersonalEvent[],
  birthdays: NetworkBirthday[],
): DayModel {
  const key = zonedDayKey(date);
  return {
    key,
    date,
    num: key.slice(8).replace(/^0/, ""),
    weekday: longWeekday ? formatWeekdayLong(date) : formatWeekdayShort(date),
    weekdayShort: formatWeekdayShort(date),
    inMonth: isSameMonth(date, monthStart),
    events: events.filter((event) => eventDayKey(event.starts_at, event.timezone) === key),
    slots: slotsFor(events.filter((event) => eventDayKey(event.starts_at, event.timezone) === key)),
    personal: personal.filter((item) => eventDayKey(item.starts_at, item.timezone) === key),
    birthdays: birthdays.filter((item) => birthdayMatchesDay(item.birthday_month, item.birthday_day, key)),
  };
}
