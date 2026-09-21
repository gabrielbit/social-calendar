import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Instagram, Rss } from "lucide-react";
import { formatDuration, formatEventClock } from "@/lib/dates";
import type { HomeCalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventTileProps = {
  event: HomeCalendarEvent;
  compact?: boolean;
  month?: boolean;
};

function tileTexture(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) % 100000;
  }
  const angle = 15 + (hash % 150);
  const band = 5 + (hash % 9);
  const colors = ["#3D2F73", "#2A2640", "#4A3D7A", "#1C1930"];
  const start = colors[hash % 4];
  return `repeating-linear-gradient(${angle}deg, ${start} 0 ${band}px, #0C0A16 ${band}px ${Math.round(band * 2.4)}px)`;
}

export function EventTile({ event, compact = false, month = false }: EventTileProps) {
  const href = `/e/${event.occurrence_id}`;
  const start = formatEventClock(event.starts_at, event.timezone, event.all_day);
  const end = event.all_day ? null : formatEventClock(event.ends_at, event.timezone, false);
  const duration = formatDuration(event.starts_at, event.ends_at, event.all_day);
  const hasIg = Boolean(event.site_url?.includes("instagram.com"));
  const Icon = event.going ? CheckCircle2 : Rss;

  if (month) {
    return (
      <Link
        href={href}
        aria-label={`${event.title}, ${start}`}
        className="cal-month-wrap"
      >
        <span
          className={cn(
            "relative block size-full min-h-[18px] overflow-hidden rounded-sm",
            event.going && "outline outline-1 outline-offset-[-1px] outline-accent",
          )}
          style={{ backgroundImage: tileTexture(event.title) }}
        >
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : null}
          <span className="absolute inset-0 bg-gradient-to-t from-canvas/70 to-canvas/10" />
        </span>
        <span className="cal-month-tip">
          <span className="flex items-center gap-1">
            <Icon
              className={cn("size-3", event.going ? "text-accent" : "text-ink-faint")}
              aria-hidden
            />
            <span className="text-[11px] tabular-nums text-accent">{start}</span>
          </span>
          <span className="mt-1 block text-xs text-pretty text-ink">{event.title}</span>
          {event.place ? (
            <span className="mt-0.5 block text-[11px] text-ink-muted">{event.place}</span>
          ) : null}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label={`${event.title}, ${start}`}
      className={cn("cal-tile", compact && "cal-tile-compact", event.going && "cal-tile-going")}
      style={{ backgroundImage: tileTexture(event.title) }}
    >
      {event.cover_image_url ? (
        <Image
          src={event.cover_image_url}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 40vw, 16vw"
        />
      ) : null}
      <span className="cal-tile-scrim" aria-hidden />
      {!event.going ? <span className="cal-tile-dim" aria-hidden /> : null}
      <span className="cal-tile-rail" aria-hidden />
      <span className="cal-tile-content">
        <span className="min-h-0 flex-1 overflow-hidden">
          <span className="flex items-center gap-1">
            <Icon
              className={cn("size-3 shrink-0", event.going ? "text-accent" : "text-ink-faint")}
              aria-hidden
            />
            <span className="text-[11px] tabular-nums tracking-wide text-accent">{start}</span>
            {end ? <span className="cal-tile-end text-[11px] tabular-nums text-ink-muted">– {end}</span> : null}
            {event.going ? (
              <span className="cal-tile-badge ml-auto shrink-0 rounded-full border border-accent bg-accent-soft px-1.5 py-px text-[9px] uppercase text-accent">
                Voy
              </span>
            ) : (
              <span className="cal-tile-dur ml-auto text-[10px] text-ink-faint">{duration}</span>
            )}
          </span>
          <span className="cal-tile-title mt-1 font-medium text-pretty text-ink">{event.title}</span>
          {event.place ? (
            <span className="cal-tile-place mt-0.5 block truncate text-[11px] text-ink-muted">
              {event.place}
            </span>
          ) : null}
        </span>
        <span className="cal-tile-meta mt-1 inline-flex max-w-full items-center gap-1.5 self-start rounded-full bg-canvas/70 px-1.5 py-0.5">
          {event.price_label ? (
            <span className="truncate text-[10px] text-ink-muted">{event.price_label}</span>
          ) : null}
          {hasIg ? <Instagram className="size-3 text-ink-faint" aria-hidden /> : null}
          <span className="truncate text-[10px] text-accent">@{event.author_slug}</span>
        </span>
      </span>
    </Link>
  );
}
