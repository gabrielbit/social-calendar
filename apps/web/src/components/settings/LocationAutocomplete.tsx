"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { googleMapsWindow, loadGoogleMapsPlaces } from "@/lib/google-maps";

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LocationAutocomplete({ value, onChange }: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const [mapsError, setMapsError] = useState<string | null>(null);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    let listener: unknown;

    void loadGoogleMapsPlaces()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        const maps = googleMapsWindow().google?.maps;
        if (!maps?.places) {
          setMapsError("Google Maps no cargó el autocompletado.");
          return;
        }
        const autocomplete = new maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "name"],
          types: ["geocode"],
          componentRestrictions: { country: "ar" },
        });
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const label = place.formatted_address || place.name || "";
          if (label) onChangeRef.current(label);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMapsError(error instanceof Error ? error.message : "No se pudo cargar Google Maps");
        }
      });

    return () => {
      cancelled = true;
      const maps = googleMapsWindow().google?.maps;
      if (listener && maps) maps.event.removeListener(listener);
    };
  }, []);

  return (
    <div className="relative mt-1">
      <span className="pointer-events-none absolute left-3 top-1/2 z-raised -translate-y-1/2 text-ink-faint">
        <MapPin className="size-4" aria-hidden />
      </span>
      <input
        ref={inputRef}
        className="input-field pl-9"
        value={value}
        autoComplete="off"
        placeholder="Palermo, Buenos Aires"
        onChange={(e) => onChange(e.target.value)}
      />
      {mapsError ? (
        <p className="mt-1 text-xs text-ink-faint">
          Autocompletado de Maps no disponible. Podés escribir la ubicación a mano.
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink-faint">Sugerencias de Google Maps al escribir.</p>
      )}
    </div>
  );
}
