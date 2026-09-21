type PlacePrediction = {
  placeId?: string;
  text?: { toString: () => string };
};

type PlacesLibrary = {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      includedRegionCodes?: string[];
      language?: string;
      region?: string;
    }) => Promise<{
      suggestions: Array<{ placePrediction?: PlacePrediction }>;
    }>;
  };
};

type GoogleMapsWindow = Window & {
  google?: {
    maps: {
      importLibrary?: (name: string) => Promise<PlacesLibrary>;
    };
  };
  __agendaMapsReady?: () => void;
  gm_authFailure?: () => void;
};

export type GooglePlaceSuggestion = {
  placeId: string;
  label: string;
};

export function googleMapsErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/referer|referrer|blocked|RefererNotAllowed/i.test(raw)) {
    return "Google Maps no autoriza localhost. En la clave, restricciones de sitios web, agregá http://localhost:3000/*";
  }
  return raw;
}

let loading: Promise<void> | null = null;

function mapsWindow(): GoogleMapsWindow {
  return window as GoogleMapsWindow;
}

export function loadGoogleMapsPlaces(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps solo corre en el navegador"));
  }

  const w = mapsWindow();
  if (w.google?.maps?.importLibrary) return Promise.resolve();
  if (loading) return loading;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
  }

  loading = new Promise((resolve, reject) => {
    const fail = (message: string) => {
      loading = null;
      reject(new Error(message));
    };

    w.gm_authFailure = () => {
      fail(
        "Google Maps no autoriza este sitio. En la clave, agregá http://localhost:3000/* a los referrers HTTP.",
      );
    };

    w.__agendaMapsReady = () => {
      delete w.__agendaMapsReady;
      if (w.google?.maps?.importLibrary) resolve();
      else fail("Google Maps no cargó Places.");
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-agenda-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => w.__agendaMapsReady?.(), { once: true });
      existing.addEventListener("error", () => fail("No se pudo cargar Google Maps"), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.dataset.agendaGoogleMaps = "true";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&libraries=places&language=es&region=AR&callback=__agendaMapsReady`;
    script.onerror = () => fail("No se pudo cargar Google Maps");
    document.head.appendChild(script);
  });

  return loading;
}

export async function fetchGooglePlaceSuggestions(input: string): Promise<GooglePlaceSuggestion[]> {
  const query = input.trim();
  if (query.length < 2) return [];

  await loadGoogleMapsPlaces();
  const importLibrary = mapsWindow().google?.maps?.importLibrary;
  if (!importLibrary) {
    throw new Error("Google Maps Places no está disponible");
  }

  const places = await importLibrary("places");
  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: query,
    includedRegionCodes: ["AR"],
    language: "es",
    region: "ar",
  });

  return suggestions
    .map((suggestion) => ({
      placeId: suggestion.placePrediction?.placeId ?? "",
      label: suggestion.placePrediction?.text?.toString() ?? "",
    }))
    .filter((item) => item.placeId && item.label)
    .slice(0, 6);
}
