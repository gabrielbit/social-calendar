"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { InstagramIcon } from "@/components/icons/InstagramIcon";

export function InstagramSource({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5 rounded border border-divider px-3 py-2.5">
      <InstagramIcon className="size-4 shrink-0 text-accent-300" />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-ink">Flyer y detalles publicados en Instagram</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[11.5px] text-accent-300 hover:text-accent-200"
        >
          {url}
        </a>
      </div>
      <button type="button" onClick={copy} className="btn-secondary shrink-0 text-xs">
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Copiado" : "Copiar link"}
      </button>
    </div>
  );
}
