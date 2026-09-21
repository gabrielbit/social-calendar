import { clientApiGet } from "@/lib/api-client";

export type GooglePlaceSuggestion = {
  placeId: string;
  label: string;
};

export function googleMapsErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/referer|referrer|blocked|RefererNotAllowed/i.test(raw)) {
    return "No se pudieron cargar las sugerencias de Google Maps.";
  }
  return raw;
}

export async function fetchGooglePlaceSuggestions(input: string): Promise<GooglePlaceSuggestion[]> {
  const query = input.trim();
  if (query.length < 2) return [];

  const { suggestions } = await clientApiGet<{ suggestions: GooglePlaceSuggestion[] }>(
    `/places/autocomplete?q=${encodeURIComponent(query)}`,
  );
  return suggestions ?? [];
}
