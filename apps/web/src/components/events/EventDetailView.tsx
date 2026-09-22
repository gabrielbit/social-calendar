"use client";

import Link from "next/link";
import { ExternalLink, Pencil, Ticket } from "lucide-react";
import { buildGoogleMapsUrl, resolveContactDisplay } from "@agenda/domain";
import { ContactLinks } from "@/components/contact/ContactLinks";
import { EventActions } from "@/components/events/EventActions";
import { useEventDetailNavigateAway } from "@/components/events/EventDetailDialog";
import { EventFlyer } from "@/components/events/EventFlyer";
import { InstagramSource } from "@/components/events/InstagramSource";
import { formatEventClock, formatEventDate } from "@/lib/dates";
import type { OccurrenceDetail } from "@/lib/types";

type EventDetailViewProps = {
  occurrence: OccurrenceDetail;
  agendaSlug?: string;
  curatedFrom?: { slug: string; display_name: string } | null;
  showCanonicalLink?: boolean;
  canEdit?: boolean;
};

function dedupeLocationParts(parts: string[]): string[] {
  const clean = [...new Set(parts.map((part) => part.trim()).filter(Boolean))];
  return clean.filter(
    (part, index) =>
      !clean.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.length >= part.length &&
          other.toLowerCase().includes(part.toLowerCase()),
      ),
  );
}

function isInstagramUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    return new URL(url).hostname.replace(/^www\./, "").endsWith("instagram.com");
  } catch {
    return false;
  }
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function EventDetailView({
  occurrence,
  agendaSlug,
  curatedFrom = null,
  showCanonicalLink = false,
  canEdit = false,
}: EventDetailViewProps) {
  const { event } = occurrence;
  const author = event.author;
  const navigateAway = useEventDetailNavigateAway();
  const editHref = `/events/${event.id}/edit`;

  const dateLabel = capitalize(
    formatEventDate(occurrence.starts_at, occurrence.timezone, occurrence.all_day),
  );
  const startClock = formatEventClock(
    occurrence.starts_at,
    occurrence.timezone,
    occurrence.all_day,
  );
  const whenLabel = occurrence.all_day ? dateLabel : `${dateLabel} · ${startClock}`;

  const placeLine = [event.venue?.name, event.venue?.zone].filter(Boolean).join(" · ");
  const mapsQuery = dedupeLocationParts(
    [event.venue?.name, event.venue?.address, event.venue?.zone, event.venue?.city].filter(
      Boolean,
    ) as string[],
  ).join(", ");
  const mapsUrl = mapsQuery ? buildGoogleMapsUrl(mapsQuery) : null;
  const locationForCalendar = mapsQuery || placeLine || undefined;

  const priceLabel = event.is_free ? "gratis" : event.price_label;
  const goingLabel =
    occurrence.going_count > 0
      ? occurrence.going_count === 1
        ? "1 confirmado"
        : `${occurrence.going_count} confirmados`
      : null;
  const metaParts = [placeLine || null, priceLabel, goingLabel].filter(Boolean);

  const images = [event.cover_image_url, ...(event.gallery_urls ?? [])].filter(
    (src): src is string => Boolean(src),
  );
  const instagramUrl = isInstagramUrl(event.site_url) ? event.site_url : null;

  const contact = resolveContactDisplay(
    {
      allowContact: event.allow_contact,
      instagram: event.contact_instagram,
      whatsapp: event.contact_whatsapp,
      email: event.contact_email,
    },
    author
      ? {
          allowContact: author.allow_contact ?? false,
          instagram: author.instagram_handle ?? null,
          whatsapp: author.whatsapp_phone ?? null,
          email: author.contact_email ?? null,
        }
      : null,
  );

  return (
    <EventFlyer images={images} title={event.title}>
      <div className="flex items-center gap-2">
        <p className="text-[12.5px] text-accent-300">{whenLabel}</p>
        {curatedFrom ? (
          <p className="text-[11.5px] text-neutral-500">
            · curado de{" "}
            <Link href={`/a/${curatedFrom.slug}`} className="hover:text-accent-300">
              @{curatedFrom.slug}
            </Link>
          </p>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 id="event-detail-title" className="text-balance text-[20px] font-medium leading-tight text-ink">
          {event.title}
        </h1>
        {canEdit ? (
          navigateAway ? (
            <button
              type="button"
              className="btn-secondary shrink-0 text-[13px]"
              onClick={() => navigateAway(editHref)}
            >
              <Pencil className="size-3.5" aria-hidden />
              Editar evento
            </button>
          ) : (
            <Link href={editHref} className="btn-secondary shrink-0 text-[13px]">
              <Pencil className="size-3.5" aria-hidden />
              Editar evento
            </Link>
          )
        ) : null}
      </div>

      {metaParts.length > 0 ? (
        <p className="text-pretty text-sm text-neutral-300">
          {placeLine && mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-divider underline-offset-4 hover:text-accent-300 hover:decoration-accent-300"
            >
              {placeLine}
            </a>
          ) : (
            placeLine
          )}
          {placeLine && (priceLabel || goingLabel) ? " · " : null}
          {[priceLabel, goingLabel].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {event.tickets_url || event.online_url ? (
        <div className="flex flex-wrap gap-2">
          {event.tickets_url ? (
            <a
              href={event.tickets_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary shrink-0 text-[13px]"
            >
              <Ticket className="size-3.5" aria-hidden />
              Comprar entradas
            </a>
          ) : null}
          {event.online_url ? (
            <a
              href={event.online_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary shrink-0 text-[13px]"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Enlace online
            </a>
          ) : null}
        </div>
      ) : null}

      {event.tags && event.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {event.tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/explorar?tag=${tag.slug}`}
              className="rounded-md bg-neutral-800 px-2.5 py-0.5 text-[11px] text-neutral-100 hover:bg-accent-800"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      ) : null}

      {event.description_html ? (
        <div
          className="prose prose-invert prose-sm max-w-none text-pretty leading-relaxed text-neutral-300 prose-headings:text-ink prose-a:text-accent-300 prose-strong:text-ink"
          dangerouslySetInnerHTML={{ __html: event.description_html }}
        />
      ) : null}

      {instagramUrl ? <InstagramSource url={instagramUrl} /> : null}

      {contact ? (
        <section>
          <p className="mb-2 text-[12.5px] text-ink">
            {contact.source === "event" ? "Contacto del evento" : "Contacto del organizador"}
          </p>
          <ContactLinks
            contact={contact.channels}
            message={`Hola! Vi “${event.title}” en Agenda Comunidad`}
            emailSubject={event.title}
          />
        </section>
      ) : null}

      <div className="border-t border-divider pt-2.5 text-xs text-neutral-600">
        {author ? (
          <>
            Publicado por{" "}
            <Link href={`/a/${author.slug}`} className="text-neutral-400 hover:text-accent-300">
              {author.display_name}
            </Link>
            {showCanonicalLink ? null : " · esta página es la canónica de la ocurrencia"}
          </>
        ) : (
          "esta página es la canónica de la ocurrencia"
        )}
      </div>

      <EventActions
        occurrenceId={occurrence.id}
        title={event.title}
        startsAt={occurrence.starts_at}
        endsAt={occurrence.ends_at}
        allDay={occurrence.all_day}
        timezone={occurrence.timezone}
        description={event.description_html?.replace(/<[^>]+>/g, " ")}
        location={locationForCalendar}
        canonicalPath={showCanonicalLink ? `/e/${occurrence.id}` : undefined}
      />

      {agendaSlug ? (
        <p className="text-sm text-neutral-500">
          <Link href={`/a/${agendaSlug}`} className="hover:text-accent-300">
            ← Volver a la agenda
          </Link>
        </p>
      ) : null}
    </EventFlyer>
  );
}
