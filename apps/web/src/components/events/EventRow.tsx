import Link from "next/link";
import Image from "next/image";
import { formatEventClock } from "@/lib/dates";
import type { ExploreResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventRowProps = {
  event: ExploreResult;
  href?: string;
  className?: string;
};

export function EventRow({ event, href, className }: EventRowProps) {
  const link = href ?? `/e/${event.occurrence_id}`;
  const clock = formatEventClock(event.starts_at, event.timezone, event.all_day);
  const meta = [
    event.zone,
    ...event.tag_slugs.slice(0, 3).map((slug) => slug.replace(/-/g, " ")),
  ].filter(Boolean);

  return (
    <article className={cn("flex min-w-0 items-start gap-3 sm:gap-4", className)}>
      <p className="w-12 shrink-0 pt-1 text-sm tabular-nums text-ink-muted sm:w-14">{clock}</p>
      <Link
        href={link}
        aria-label={event.title}
        className="relative size-16 shrink-0 overflow-hidden rounded-xl sm:size-[4.5rem]"
      >
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt=""
            fill
            className="object-cover"
            sizes="72px"
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-surface text-lg text-ink-faint">
            {event.title.charAt(0)}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="text-base font-medium text-pretty">
          <Link href={link} className="text-ink hover:text-white">
            {event.title}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-sm text-ink-muted">
          via{" "}
          <Link href={`/a/${event.author_slug}`} className="hover:text-ink">
            @{event.author_slug}
          </Link>
        </p>
        {meta.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {meta.map((item) => (
              <li
                key={item}
                className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-ink-faint"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}