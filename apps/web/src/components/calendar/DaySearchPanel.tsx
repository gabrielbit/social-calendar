import Link from "next/link";
import { Plus, Search } from "lucide-react";

type DaySearchPanelProps = {
  dayKey: string;
  label: string;
  fill?: boolean;
};

export function DaySearchPanel({ dayKey, label, fill = false }: DaySearchPanelProps) {
  return (
    <div
      className={cnPanel(fill)}
    >
      <div className="flex items-center gap-2 rounded-md border border-border bg-canvas px-2.5 py-2">
        <Search className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
        <input
          type="search"
          disabled
          placeholder={`Buscar planes para el ${label}`}
          aria-label={`Buscar planes para el ${label}. Todavía no está disponible.`}
          className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      <p className="text-[10px] uppercase text-ink-faint">Pasa este día cerca tuyo</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="text-pretty text-[13px] text-ink-muted">
          La búsqueda de planes está en el roadmap. Por ahora podés crear un evento o mirar qué hay en Explorar.
        </p>
      </div>
      <Link
        href={`/events/new?date=${dayKey}`}
        className="flex items-center gap-2.5 rounded-md border border-dashed border-border px-2.5 py-2 text-[13px] text-accent hover:border-accent hover:bg-accent-soft"
      >
        <Plus className="size-3.5 shrink-0" aria-hidden />
        Crear un evento el {label}
      </Link>
      <div className="border-t border-border pt-2">
        <Link
          href={`/explorar?from=${dayKey}T00:00:00-03:00&to=${dayKey}T23:59:59-03:00`}
          className="text-[12px] text-ink-muted hover:text-ink"
        >
          Ver todo lo del {label}
        </Link>
      </div>
    </div>
  );
}

function cnPanel(fill: boolean) {
  return [
    "flex min-h-0 flex-col gap-2.5 rounded-lg border border-accent/40 bg-surface p-3",
    fill ? "flex-1" : "flex-none",
  ].join(" ");
}
