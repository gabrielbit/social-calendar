import Link from "next/link";
import { CalendarDays, Compass, Plus, Settings, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const links = [
  { href: "/explorar", label: "Explorar", icon: Compass },
  { href: "/mi-agenda", label: "Mi agenda", icon: CalendarDays },
  { href: "/events/new", label: "Nuevo", icon: Plus },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            AC
          </span>
          <span className="hidden font-semibold tracking-tight text-ink sm:inline">
            Agenda Comunidad
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink sm:px-3",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}

          {user ? (
            <Link
              href="/settings"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent"
              aria-label="Tu perfil"
            >
              <User className="h-4 w-4" />
            </Link>
          ) : (
            <Link href="/auth/login" className="btn-primary ml-1 px-3 py-2 text-sm">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
