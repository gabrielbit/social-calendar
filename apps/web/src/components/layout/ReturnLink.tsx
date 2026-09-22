"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { rememberedSection, returnToLabel, safeReturnPath } from "@/lib/return-to";

export function useReturnTo(explicit?: string | null) {
  const safe = safeReturnPath(explicit);
  const [path, setPath] = useState(safe ?? "/");

  useEffect(() => {
    setPath(safe ?? rememberedSection());
  }, [safe]);

  return path;
}

export function ReturnLink({ explicit }: { explicit?: string | null }) {
  const router = useRouter();
  const returnTo = useReturnTo(explicit);

  return (
    <button
      type="button"
      onClick={() => router.replace(returnTo)}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {returnToLabel(returnTo)}
    </button>
  );
}
