"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  fetchGooglePlaceSuggestions,
  googleMapsErrorMessage,
  type GooglePlaceSuggestion,
} from "@/lib/google-maps";
import { cn } from "@/lib/utils";

type LocationAutocompleteProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function LocationAutocomplete({
  id,
  name,
  value,
  onChange,
  placeholder = "Palermo, Buenos Aires",
}: LocationAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const timerRef = useRef<number>(0);
  const [suggestions, setSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  function scheduleSearch(query: string) {
    window.clearTimeout(timerRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      requestRef.current += 1;
      setSuggestions([]);
      setOpen(false);
      setError(null);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      const requestId = ++requestRef.current;
      void fetchGooglePlaceSuggestions(trimmed)
        .then((results) => {
          if (requestId !== requestRef.current) return;
          setSuggestions(results);
          setActive(0);
          setOpen(results.length > 0);
          setError(null);
        })
        .catch((err: unknown) => {
          if (requestId !== requestRef.current) return;
          setSuggestions([]);
          setOpen(false);
          setError(googleMapsErrorMessage(err));
        });
    }, 250);
  }

  function pick(suggestion: GooglePlaceSuggestion) {
    onChange(suggestion.label);
    setSuggestions([]);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      const selected = suggestions[active];
      if (selected) {
        event.preventDefault();
        pick(selected);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative mt-1">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-ink-faint">
          <MapPin className="size-4" aria-hidden />
        </span>
        <input
          id={id}
          name={name}
          type="text"
          className="input-field pl-9"
          value={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          onChange={(event) => {
            onChange(event.target.value);
            scheduleSearch(event.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-overlay mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeId} role="presentation">
              <button
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm text-ink",
                  index === active && "bg-accent-soft",
                )}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(suggestion)}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="mt-1 text-pretty text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink-faint">Sugerencias de Google Maps al escribir.</p>
      )}
    </div>
  );
}
