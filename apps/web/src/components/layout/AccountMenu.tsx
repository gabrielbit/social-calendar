"use client";

import { LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AccountMenuProps = {
  name: string;
  avatarUrl: string | null;
};

export function AccountMenu({ name, avatarUrl }: AccountMenuProps) {
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <details className="relative">
      <summary
        className="flex size-8 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-medium text-canvas [&::-webkit-details-marker]:hidden"
        aria-label="Tu cuenta"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={32} height={32} className="size-8 object-cover" />
        ) : (
          <span aria-hidden>{initials(name)}</span>
        )}
      </summary>
      <div className="absolute right-0 z-nav mt-2 w-48 rounded-xl border border-border bg-surface p-1 shadow-md">
        <p className="truncate px-3 py-2 text-xs text-ink-muted">{name}</p>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-white/[0.04]"
        >
          <Settings className="size-4 text-ink-faint" aria-hidden />
          Ajustes
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-white/[0.04]"
        >
          <LogOut className="size-4 text-ink-faint" aria-hidden />
          Cerrar sesión
        </button>
      </div>
    </details>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}
