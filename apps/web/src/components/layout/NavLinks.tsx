"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/explorar",
    label: "Agenda pública",
    match: (path: string) => path === "/" || path === "/explorar" || path.startsWith("/a/"),
    icon: Compass,
  },
  {
    href: "/mi-agenda",
    label: "Mi agenda",
    match: (path: string) => path.startsWith("/mi-agenda"),
    icon: CalendarDays,
  },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Principal">
      {links.map(({ href, label, match, icon: Icon }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-sm transition-colors duration-200 ease-out",
              active ? "text-accent" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon className="size-4 sm:hidden" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
      <Link
        href="/events/new"
        className="btn-primary ml-1 size-8 p-0 sm:ml-2 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5"
        aria-label="Crear evento"
      >
        <Plus className="size-4" aria-hidden />
        <span className="hidden sm:inline">Crear evento</span>
      </Link>
    </nav>
  );
}
