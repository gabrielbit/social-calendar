import type { AgendaOccurrence, ExploreResult } from "@/lib/types";

export function occurrenceToExplore(occurrence: AgendaOccurrence): ExploreResult {
  return {
    occurrence_id: occurrence.occurrence_id,
    title: occurrence.title,
    starts_at: occurrence.starts_at,
    ends_at: occurrence.ends_at,
    all_day: occurrence.all_day,
    timezone: occurrence.timezone,
    cover_image_url: occurrence.cover_image_url,
    author_slug: occurrence.original_promoter_slug,
    author_name: occurrence.original_promoter_name,
    zone: null,
    tag_slugs: [],
  };
}

export type AgendaSourceItem = {
  slug: string;
  name: string;
  count: number;
  own: boolean;
};

export function sourcesFromOccurrences(
  occurrences: AgendaOccurrence[],
  ownerSlug: string,
): AgendaSourceItem[] {
  const map = new Map<string, AgendaSourceItem>();
  for (const occurrence of occurrences) {
    const own = occurrence.inclusion_reason === "own";
    const slug = own ? ownerSlug : occurrence.original_promoter_slug;
    const name = own ? "Eventos propios" : occurrence.original_promoter_name;
    const current = map.get(slug);
    if (current) {
      current.count += 1;
    } else {
      map.set(slug, { slug, name, count: 1, own });
    }
  }
  return [...map.values()].sort((a, b) => Number(b.own) - Number(a.own) || b.count - a.count);
}