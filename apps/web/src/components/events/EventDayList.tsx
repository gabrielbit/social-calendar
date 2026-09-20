import { EventRow } from "@/components/events/EventRow";
import { groupEventsByDay } from "@/lib/dates";
import type { ExploreResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventDayListProps = {
  events: ExploreResult[];
  hrefFor?: (event: ExploreResult) => string;
  empty?: React.ReactNode;
  className?: string;
};

export function EventDayList({ events, hrefFor, empty, className }: EventDayListProps) {
  if (events.length === 0) {
    return <>{empty}</>;
  }

  const groups = groupEventsByDay(events);

  return (
    <ol className={cn("space-y-10", className)}>
      {groups.map((group) => (
        <li key={group.key} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-6">
          <div className="pt-1">
            <time dateTime={group.key} className="block">
              <span className="block text-2xl font-medium leading-none tabular-nums text-ink">
                {group.column.day}
              </span>
              <span className="mt-1 block text-[11px] uppercase text-ink-faint">
                {group.column.weekday}
              </span>
              <span className="block text-[11px] text-ink-faint">{group.column.month}</span>
            </time>
          </div>
          <ul className="space-y-5">
            {group.events.map((event) => (
              <li key={event.occurrence_id}>
                <EventRow event={event} href={hrefFor?.(event)} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}