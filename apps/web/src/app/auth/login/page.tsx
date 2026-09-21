"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { appUrl } from "@/lib/dates";
import { Container } from "@/components/layout/Container";
import { authErrorMessage } from "@/lib/auth-errors";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const queryError = params.get("error");
    if (queryError === "auth") {
      setError("No se pudo completar el acceso. Probá de nuevo.");
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) return;

    const supabase = createClient();
    void supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error: authError }) => {
      if (authError || !data.session) return;
      window.location.replace("/");
    });
  }, []);

  async function handleMagicLink() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: appUrl("/auth/callback"),
      },
    });
    setLoading(false);
    if (authError) {
      setError(authErrorMessage(authError.message));
      return;
    }
    setSent(true);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authErrorMessage(authError.message));
      return;
    }
    window.location.href = "/";
  }

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: appUrl("/auth/callback"),
      },
    });
    if (authError) setError(authErrorMessage(authError.message));
  }

  return (
    <Container className="flex min-h-[calc(100dvh-10rem)] items-center py-16">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="page-title">Entrar</h1>
        <p className="page-lede mx-auto">Con email, Google o un enlace mágico.</p>

        {sent ? (
          <div className="card mt-8 text-pretty text-sm text-ink-muted" role="status">
            Te enviamos un enlace a <strong className="text-ink">{email}</strong>. Revisá tu
            bandeja.
          </div>
        ) : (
          <form onSubmit={handlePassword} className="mt-8 space-y-4 text-left">
            <label className="block text-sm">
              <span className="text-ink-muted">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                className="input-field mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Contraseña</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input-field mt-1.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              disabled={loading || !email}
              onClick={handleMagicLink}
              className="btn-secondary w-full"
            >
              <Mail className="size-4" aria-hidden />
              Enviame un enlace
            </button>
          </form>
        )}

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-canvas px-2 text-ink-faint">o</span>
          </div>
        </div>

        <button type="button" onClick={handleGoogle} className="btn-secondary w-full">
          Continuar con Google
        </button>

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <p className="mt-8 text-sm text-ink-muted">
          ¿No tenés cuenta?{" "}
          <Link href="/auth/signup" className="text-ink hover:text-white">
            Crear cuenta
          </Link>
        </p>
        <p className="mt-4 text-sm text-ink-faint">
          <Link href="/" className="hover:text-ink">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </Container>
  );
}
