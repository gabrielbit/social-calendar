import Link from "next/link";
import Image from "next/image";
import { MapPin, User } from "lucide-react";
import { formatEventDate, formatEventTime } from "@/lib/dates";
import type { ExploreResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventCardProps = {
  event: ExploreResult;
  href?: string;
  className?: string;
};

export function EventCard({ event, href, className }: EventCardProps) {
  const link = href ?? `/e/${event.occurrence_id}`;
  const dateLabel = formatEventDate(event.starts_at, event.timezone, event.all_day);
  const timeLabel = formatEventTime(
    event.starts_at,
    event.ends_at,
    event.timezone,
    event.all_day,
  );

  return (
    <article className={cn("card flex gap-4 transition-shadow hover:shadow-md", className)}>
      {event.cover_image_url ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
          <Image
            src={event.cover_image_url}
            alt=""
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <span className="text-2xl font-semibold">{event.title.charAt(0)}</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <Link href={link} className="group">
          <h3 className="font-semibold text-ink group-hover:text-accent">{event.title}</h3>
        </Link>
        <p className="mt-0.5 text-sm text-ink-muted">
          {dateLabel}
          {timeLabel ? ` · ${timeLabel}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" aria-hidden />
            <Link href={`/a/${event.author_slug}`} className="hover:text-accent">
              {event.author_name}
            </Link>
          </span>
          {event.zone && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {event.zone}
            </span>
          )}
        </div>
        {event.tag_slugs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {event.tag_slugs.slice(0, 4).map((tag) => (
              <Link
                key={tag}
                href={`/explorar?tag=${tag}`}
                className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted hover:bg-accent-soft hover:text-accent"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
