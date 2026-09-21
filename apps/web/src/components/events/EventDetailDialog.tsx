"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EventDetailCloseContext = createContext<(() => void) | null>(null);

export function useEventDetailClose() {
  return useContext(EventDetailCloseContext);
}

type EventDetailDialogProps = {
  children: React.ReactNode;
  onDismiss?: () => void;
};

export function EventDetailDialog({ children, onDismiss }: EventDetailDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const dismissed = useRef(false);

  function close() {
    ref.current?.close();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();

    function onClose() {
      if (dismissed.current) return;
      dismissed.current = true;
      if (onDismiss) onDismiss();
      else router.back();
    }

    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [onDismiss, router]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="event-detail-title"
      className="event-detail-dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <EventDetailCloseContext.Provider value={close}>{children}</EventDetailCloseContext.Provider>
    </dialog>
  );
}
