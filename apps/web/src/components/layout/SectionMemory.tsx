"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rememberSection } from "@/lib/return-to";

export function SectionMemory() {
  const pathname = usePathname();

  useEffect(() => {
    rememberSection(pathname);
  }, [pathname]);

  return null;
}
