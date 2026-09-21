type GoogleMapsWindow = Window & {
  google?: {
    maps: {
      places: {
        Autocomplete: new (
          field: HTMLInputElement,
          opts?: {
            fields?: string[];
            types?: string[];
            componentRestrictions?: { country: string | string[] };
          },
        ) => GoogleAutocomplete;
      };
      event: {
        removeListener: (listener: unknown) => void;
      };
    };
  };
  __agendaMapsReady?: () => void;
};

export type GoogleAutocomplete = {
  addListener: (eventName: string, handler: () => void) => unknown;
  getPlace: () => { formatted_address?: string; name?: string };
};

let loading: Promise<void> | null = null;

export function loadGoogleMapsPlaces(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps solo corre en el navegador"));
  }

  const w = window as GoogleMapsWindow;
  if (w.google?.maps?.places) return Promise.resolve();
  if (loading) return loading;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
  }

  loading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-agenda-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Google Maps")), {
        once: true,
      });
      return;
    }

    w.__agendaMapsReady = () => {
      resolve();
      delete w.__agendaMapsReady;
    };

    const script = document.createElement("script");
    script.dataset.agendaGoogleMaps = "true";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=es&region=AR&callback=__agendaMapsReady`;
    script.onerror = () => {
      loading = null;
      reject(new Error("No se pudo cargar Google Maps"));
    };
    document.head.appendChild(script);
  });

  return loading;
}

export function googleMapsWindow(): GoogleMapsWindow {
  return window as GoogleMapsWindow;
}
