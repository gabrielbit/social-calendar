import Image from "next/image";
import Link from "next/link";
import { MapPin, Globe, Ticket } from "lucide-react";
import { EventActions } from "@/components/events/EventActions";
import { formatEventDate, formatEventTime } from "@/lib/dates";
import type { OccurrenceDetail } from "@/lib/types";

type EventDetailViewProps = {
  occurrence: OccurrenceDetail;
  agendaSlug?: string;
  showCanonicalLink?: boolean;
};

export function EventDetailView({
  occurrence,
  agendaSlug,
  showCanonicalLink = false,
}: EventDetailViewProps) {
  const { event } = occurrence;
  const dateLabel = formatEventDate(
    occurrence.starts_at,
    occurrence.timezone,
    occurrence.all_day,
  );
  const timeLabel = formatEventTime(
    occurrence.starts_at,
    occurrence.ends_at,
    occurrence.timezone,
    occurrence.all_day,
  );

  const locationParts = [
    event.venue?.name,
    event.venue?.address,
    event.venue?.zone,
    event.venue?.city,
  ].filter(Boolean);
  const location = locationParts.join(", ") || undefined;

  return (
    <article className="mx-auto max-w-2xl">
      {event.cover_image_url ? (
        <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-2xl">
          <Image
            src={event.cover_image_url}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      ) : null}

      <header className="mb-8">
        <p className="text-sm text-accent">{dateLabel}</p>
        {timeLabel ? <p className="mt-0.5 text-sm tabular-nums text-ink-muted">{timeLabel}</p> : null}
        <h1 className="mt-3 text-3xl font-semibold text-balance text-ink sm:text-5xl">
          {event.title}
        </h1>
        {event.author ? (
          <p className="mt-3 text-sm text-ink-muted">
            Por{" "}
            <Link href={`/a/${event.author.slug}`} className="text-ink hover:text-white">
              {event.author.display_name}
            </Link>
          </p>
        ) : null}
      </header>

      {event.location_mode !== "online" && location ? (
        <p className="mb-3 flex items-start gap-2 text-sm text-ink-muted">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          {location}
        </p>
      ) : null}

      {event.online_url ? (
        <p className="mb-3 flex items-center gap-2 text-sm">
          <Globe className="size-4 text-ink-faint" aria-hidden />
          <a
            href={event.online_url}
            className="text-ink hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Enlace online
          </a>
        </p>
      ) : null}

      {event.tickets_url || event.price_label ? (
        <p className="mb-3 flex items-center gap-2 text-sm text-ink-muted">
          <Ticket className="size-4" aria-hidden />
          {event.is_free ? "Gratis" : event.price_label}
          {event.tickets_url ? (
            <>
              {" · "}
              <a
                href={event.tickets_url}
                className="text-ink hover:text-white"
                target="_blank"
                rel="noopener noreferrer"
              >
                Entradas
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {event.tags && event.tags.length > 0 ? (
        <div className="mb-8 mt-6 flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/explorar?tag=${tag.slug}`}
              className="rounded-full border border-border px-3 py-1 text-xs text-ink-muted hover:border-white/20 hover:text-ink"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      ) : null}

      {event.description_html ? (
        <div
          className="prose prose-invert mb-10 max-w-none text-pretty text-ink-muted prose-a:text-ink"
          dangerouslySetInnerHTML={{ __html: event.description_html }}
        />
      ) : null}

      <EventActions
        occurrenceId={occurrence.id}
        title={event.title}
        startsAt={occurrence.starts_at}
        endsAt={occurrence.ends_at}
        allDay={occurrence.all_day}
        timezone={occurrence.timezone}
        description={event.description_html?.replace(/<[^>]+>/g, " ")}
        location={location}
        canonicalPath={showCanonicalLink ? `/e/${occurrence.id}` : undefined}
      />

      {agendaSlug ? (
        <p className="mt-10 text-center text-sm text-ink-faint">
          <Link href={`/a/${agendaSlug}`} className="hover:text-ink">
            ← Volver a la agenda
          </Link>
        </p>
      ) : null}
    </article>
  );
}
