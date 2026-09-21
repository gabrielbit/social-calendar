"use client";

import { usePathname } from "next/navigation";
import { Container } from "@/components/layout/Container";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="relative border-t border-border pb-[env(safe-area-inset-bottom)]">
      <Container className="py-10 text-center text-sm text-ink-faint">
        <p>Agenda — eventos con atribución</p>
      </Container>
    </footer>
  );
}
