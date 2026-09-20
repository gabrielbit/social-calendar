import { notFound } from "next/navigation";
import { EventDetailView } from "@/components/events/EventDetailView";
import { Container } from "@/components/layout/Container";
import { getOccurrenceDetail } from "@/lib/queries";
import { appUrl } from "@/lib/dates";
import type { Metadata } from "next";

type Props = { params: Promise<{ occurrenceId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { occurrenceId } = await params;
  const occurrence = await getOccurrenceDetail(occurrenceId);
  if (!occurrence) return { title: "Evento no encontrado" };

  const { event } = occurrence;
  const description = event.description_html?.replace(/<[^>]+>/g, " ").slice(0, 160);
  const canonical = appUrl(`/e/${occurrenceId}`);

  return {
    title: event.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: event.title,
      description,
      url: canonical,
      type: "website",
      locale: "es_AR",
      ...(event.cover_image_url ? { images: [{ url: event.cover_image_url }] } : {}),
    },
  };
}

function buildJsonLd(occurrence: NonNullable<Awaited<ReturnType<typeof getOccurrenceDetail>>>) {
  const { event } = occurrence;
  if (event.location_mode === "online") return null;

  const locationParts = [
    event.venue?.name,
    event.venue?.address,
    event.venue?.zone,
    event.venue?.city,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: occurrence.starts_at,
    endDate: occurrence.ends_at,
    eventAttendanceMode:
      event.location_mode === "hybrid"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    description: event.description_html?.replace(/<[^>]+>/g, " "),
    image: event.cover_image_url ?? undefined,
    url: appUrl(`/e/${occurrence.id}`),
    ...(locationParts.length > 0
      ? {
          location: {
            "@type": "Place",
            name: event.venue?.name ?? locationParts.join(", "),
            address: event.venue?.address ?? undefined,
          },
        }
      : {}),
    organizer: event.author
      ? {
          "@type": "Organization",
          name: event.author.display_name,
          url: appUrl(`/a/${event.author.slug}`),
        }
      : undefined,
    offers: event.is_free
      ? { "@type": "Offer", price: "0", priceCurrency: "ARS", availability: "https://schema.org/InStock" }
      : event.price_label
        ? { "@type": "Offer", description: event.price_label }
        : undefined,
  };
}

export default async function CanonicalEventPage({ params }: Props) {
  const { occurrenceId } = await params;
  const occurrence = await getOccurrenceDetail(occurrenceId);
  if (!occurrence || occurrence.cancelled) notFound();

  const jsonLd = buildJsonLd(occurrence);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Container className="py-10 sm:py-14">
      <EventDetailView occurrence={occurrence} />
      </Container>
    </>
  );
}
