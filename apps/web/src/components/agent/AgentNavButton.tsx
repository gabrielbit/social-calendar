"use client";

import { useState } from "react";
import { AgentMark } from "@/components/agent/AgentMark";
import { AgentPanel } from "@/components/agent/AgentPanel";

export function AgentNavButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-agent"
        aria-label="Abrir asistente"
      >
        <AgentMark />
      </button>
      <AgentPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
