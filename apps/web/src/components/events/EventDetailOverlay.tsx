"use client";

import { useEffect, useState } from "react";
import { loadOccurrenceDetail } from "@/app/e/actions";
import { EventDetailDialog } from "@/components/events/EventDetailDialog";
import { EventDetailView } from "@/components/events/EventDetailView";

export function EventDetailOverlay({
  occurrenceId,
  onDismiss,
}: {
  occurrenceId: string;
  onDismiss: () => void;
}) {
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof loadOccurrenceDetail>>>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setPayload(null);
    setError(false);
    loadOccurrenceDetail(occurrenceId).then((data) => {
      if (!active) return;
      if (!data) setError(true);
      else setPayload(data);
    });
    return () => {
      active = false;
    };
  }, [occurrenceId]);

  return (
    <EventDetailDialog onDismiss={onDismiss}>
      {payload ? (
        <EventDetailView occurrence={payload.occurrence} canEdit={payload.canEdit} />
      ) : (
        <div
          className="h-[min(70dvh,520px)] w-full max-w-[520px] rounded-[14px] bg-surface shadow-ds-md"
          role="status"
          aria-live="polite"
        >
          {error ? (
            <p className="p-4 text-sm text-neutral-400">No se pudo abrir el evento.</p>
          ) : (
            <span className="sr-only">Cargando evento</span>
          )}
        </div>
      )}
    </EventDetailDialog>
  );
}
