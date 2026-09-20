"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { clientApiPost } from "@/lib/api-client";
import { Container } from "@/components/layout/Container";

function GoogleCalendarCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Google no devolvió un código de autorización.");
      return;
    }
    let cancelled = false;
    clientApiPost("/calendar/google/callback", { code })
      .then(() => {
        if (!cancelled) router.replace("/settings");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo conectar Google Calendar");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <Container className="py-16 text-center">
      <h1 className="page-title">Google Calendar</h1>
      {error ? (
        <p className="page-lede mx-auto text-red-400" role="alert">
          {error}
        </p>
      ) : (
        <p className="page-lede mx-auto">Conectando tu calendario…</p>
      )}
    </Container>
  );
}

export default function GoogleCalendarCallbackPage() {
  return (
    <Suspense fallback={<Container className="py-16 text-center">Conectando…</Container>}>
      <GoogleCalendarCallbackInner />
    </Suspense>
  );
}
