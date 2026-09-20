"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { cn } from "@/lib/utils";

type ExploreFiltersProps = {
  tags: { slug: string; name: string }[];
};

export function ExploreFilters({ tags }: ExploreFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const zone = searchParams.get("zone") ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => {
        router.push(`/explorar?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => e.preventDefault()}
      aria-busy={pending}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-muted">Desde</span>
          <input
            type="date"
            className="input-field"
            value={from ? from.slice(0, 10) : ""}
            onChange={(e) =>
              update("from", e.target.value ? `${e.target.value}T00:00:00-03:00` : "")
            }
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-muted">Hasta</span>
          <input
            type="date"
            className="input-field"
            value={to ? to.slice(0, 10) : ""}
            onChange={(e) =>
              update("to", e.target.value ? `${e.target.value}T23:59:59-03:00` : "")
            }
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-muted">Zona</span>
          <input
            type="search"
            className="input-field"
            placeholder="Palermo, Centro…"
            value={zone}
            onChange={(e) => update("zone", e.target.value)}
          />
        </label>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tags">
          <button
            type="button"
            onClick={() => update("tag", "")}
            className={cn("pill", tag === "" && "pill-active bg-ink text-canvas")}
          >
            Todos
          </button>
          {tags.slice(0, 16).map((t) => (
            <button
              type="button"
              key={t.slug}
              onClick={() => update("tag", tag === t.slug ? "" : t.slug)}
              className={cn(
                "pill",
                tag === t.slug && "pill-active bg-ink text-canvas",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
