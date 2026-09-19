"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";

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
      className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => e.preventDefault()}
      aria-busy={pending}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink-muted">Desde</span>
        <input
          type="date"
          className="input-field"
          value={from ? from.slice(0, 10) : ""}
          onChange={(e) =>
            update("from", e.target.value ? `${e.target.value}T00:00:00-03:00` : "")
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink-muted">Hasta</span>
        <input
          type="date"
          className="input-field"
          value={to ? to.slice(0, 10) : ""}
          onChange={(e) =>
            update("to", e.target.value ? `${e.target.value}T23:59:59-03:00` : "")
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink-muted">Tag</span>
        <select
          className="input-field"
          value={tag}
          onChange={(e) => update("tag", e.target.value)}
        >
          <option value="">Todos</option>
          {tags.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink-muted">Zona</span>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            className="input-field pl-9"
            placeholder="Palermo, Centro…"
            value={zone}
            onChange={(e) => update("zone", e.target.value)}
          />
        </div>
      </label>
    </form>
  );
}
