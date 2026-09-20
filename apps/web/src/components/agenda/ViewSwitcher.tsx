import Link from "next/link";
import { cn } from "@/lib/utils";

export type AgendaVista = "lista" | "mes" | "calendario";

const VISTAS: { id: AgendaVista; label: string }[] = [
  { id: "lista", label: "Lista" },
  { id: "mes", label: "Lista + mes" },
  { id: "calendario", label: "Calendario" },
];

export function parseVista(value?: string): AgendaVista {
  if (value === "lista" || value === "calendario") return value;
  return "mes";
}

type ViewSwitcherProps = {
  slug: string;
  current: AgendaVista;
};

export function ViewSwitcher({ slug, current }: ViewSwitcherProps) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Vista de agenda">
      {VISTAS.map((vista) => (
        <Link
          key={vista.id}
          href={`/a/${slug}?vista=${vista.id}`}
          className={cn("pill", current === vista.id && "pill-active")}
          aria-current={current === vista.id ? "page" : undefined}
        >
          {vista.label}
        </Link>
      ))}
    </nav>
  );
}