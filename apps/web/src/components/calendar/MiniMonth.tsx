import { eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { DEFAULT_TIMEZONE } from "@agenda/domain";
import { cn } from "@/lib/utils";

type MiniMonthProps = {
  eventDays: string[];
  month?: Date;
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function MiniMonth({ eventDays, month = new Date() }: MiniMonthProps) {
  const marked = new Set(eventDays);
  const todayKey = formatInTimeZone(new Date(), DEFAULT_TIMEZONE, "yyyy-MM-dd");
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const monthLabel = formatInTimeZone(month, DEFAULT_TIMEZONE, "MMMM yyyy", { locale: es });

  return (
    <section className="rounded-2xl border border-border bg-surface p-4" aria-label="Calendario del mes">
      <p className="mb-3 text-sm font-medium capitalize text-ink">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-ink-faint">
        {WEEKDAYS.map((day, i) => (
          <span key={`${day}-${i}`}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm tabular-nums">
        {days.map((day) => {
          const key = formatInTimeZone(day, DEFAULT_TIMEZONE, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const hasEvent = marked.has(key);
          const today = key === todayKey;
          return (
            <span
              key={key}
              className={cn(
                "relative mx-auto flex size-7 items-center justify-center rounded-full",
                !inMonth && "text-ink-faint/40",
                inMonth && "text-ink-muted",
                hasEvent && inMonth && "text-ink",
                today && "bg-accent text-canvas",
              )}
            >
              {formatInTimeZone(day, DEFAULT_TIMEZONE, "d")}
              {hasEvent && inMonth && !today ? (
                <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />
              ) : null}
              <span className="sr-only">
                {hasEvent && inMonth ? ", con eventos" : ""}
                {today ? ", hoy" : ""}
              </span>
            </span>
          );
        })}
      </div>
    </section>
  );
}