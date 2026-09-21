import { assertGoogleMapsConfigured, env } from "../config.js";

function mapsReferer(): string {
  const raw = env.GOOGLE_MAPS_HTTP_REFERER || env.APP_URL;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export type PlaceSuggestion = {
  placeId: string;
  label: string;
};

type PlacesAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
    };
  }>;
  error?: { message?: string; status?: string };
};

type GeocodeResponse = {
  status: string;
  error_message?: string;
  results?: Array<{
    place_id: string;
    formatted_address: string;
  }>;
};

export async function autocompletePlaces(query: string): Promise<PlaceSuggestion[]> {
  assertGoogleMapsConfigured();
  const input = query.trim();
  if (input.length < 2) return [];

  try {
    const places = await autocompletePlacesNew(input);
    if (places.length > 0) return places;
  } catch {
    // Si Places (New) no está habilitado en el proyecto, caemos a Geocoding.
  }

  return geocodePlaces(input);
}

async function autocompletePlacesNew(input: string): Promise<PlaceSuggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
      Referer: mapsReferer(),
    },
    body: JSON.stringify({
      input,
      languageCode: "es",
      regionCode: "AR",
      includedRegionCodes: ["AR"],
    }),
  });

  const json = (await res.json()) as PlacesAutocompleteResponse;
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Places autocomplete failed (${res.status})`);
  }

  return (json.suggestions ?? [])
    .map((suggestion) => ({
      placeId: suggestion.placePrediction?.placeId ?? "",
      label: suggestion.placePrediction?.text?.text ?? "",
    }))
    .filter((item) => item.placeId && item.label)
    .slice(0, 6);
}

async function geocodePlaces(input: string): Promise<PlaceSuggestion[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", input);
  url.searchParams.set("key", env.GOOGLE_MAPS_API_KEY!);
  url.searchParams.set("language", "es");
  url.searchParams.set("region", "ar");

  const res = await fetch(url, { headers: { Referer: mapsReferer() } });
  const json = (await res.json()) as GeocodeResponse;
  if (!res.ok || (json.status !== "OK" && json.status !== "ZERO_RESULTS")) {
    throw Object.assign(
      new Error(json.error_message ?? `Geocoding failed (${json.status})`),
      { statusCode: 502 },
    );
  }

  return (json.results ?? [])
    .map((result) => ({
      placeId: result.place_id,
      label: result.formatted_address,
    }))
    .slice(0, 6);
}
