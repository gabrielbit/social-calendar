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
      {event.cover_image_url && (
        <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-xl">
          <Image
            src={event.cover_image_url}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      )}

      <header className="mb-6">
        <p className="text-sm font-medium text-accent">{dateLabel}</p>
        {timeLabel && <p className="text-sm text-ink-muted">{timeLabel}</p>}
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {event.title}
        </h1>
        {event.author && (
          <p className="mt-2 text-sm text-ink-muted">
            Por{" "}
            <Link href={`/a/${event.author.slug}`} className="font-medium text-ink hover:text-accent">
              {event.author.display_name}
            </Link>
          </p>
        )}
      </header>

      {event.location_mode !== "online" && location && (
        <p className="mb-4 flex items-start gap-2 text-sm text-ink-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {location}
        </p>
      )}

      {event.online_url && (
        <p className="mb-4 flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-ink-faint" aria-hidden />
          <a href={event.online_url} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
            Enlace online
          </a>
        </p>
      )}

      {(event.tickets_url || event.price_label) && (
        <p className="mb-4 flex items-center gap-2 text-sm text-ink-muted">
          <Ticket className="h-4 w-4" aria-hidden />
          {event.is_free ? "Gratis" : event.price_label}
          {event.tickets_url && (
            <>
              {" · "}
              <a href={event.tickets_url} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                Entradas
              </a>
            </>
          )}
        </p>
      )}

      {event.tags && event.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/explorar?tag=${tag.slug}`}
              className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      {event.description_html && (
        <div
          className="prose prose-stone mb-8 max-w-none text-ink-muted prose-a:text-accent"
          dangerouslySetInnerHTML={{ __html: event.description_html }}
        />
      )}

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

      {agendaSlug && (
        <p className="mt-8 text-center text-sm text-ink-faint">
          <Link href={`/a/${agendaSlug}`} className="hover:text-accent">
            ← Volver a la agenda
          </Link>
        </p>
      )}
    </article>
  );
}
