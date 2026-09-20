import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/layout/Container";
import { NavLinks } from "@/components/layout/NavLinks";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="fixed inset-x-0 top-0 z-nav border-b border-border bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Agenda">
          <span
            className="flex size-7 items-center justify-center rounded-lg bg-surface text-accent"
            aria-hidden
          >
            <span className="size-2.5 rounded-full bg-accent" />
          </span>
          <span className="text-sm font-medium text-ink">Agenda</span>
        </Link>

        <div className="flex items-center gap-2">
          <NavLinks />
          {user ? (
            <Link
              href="/settings"
              className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-canvas"
              aria-label="Tu perfil"
            >
              <User className="size-4" />
            </Link>
          ) : (
            <Link href="/auth/login" className="btn-secondary px-3 py-1.5 text-sm">
              Entrar
            </Link>
          )}
        </div>
      </Container>
    </header>
  );
}
