"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { appUrl } from "@/lib/dates";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
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
      setError(authError.message);
      return;
    }
    setSent(true);
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
    if (authError) setError(authError.message);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-ink">Entrar</h1>
      <p className="mt-2 text-ink-muted">
        Magic link por email o Google. Sin contraseñas.
      </p>

      {sent ? (
        <div className="card mt-6 text-sm text-ink-muted" role="status">
          Te enviamos un enlace a <strong className="text-ink">{email}</strong>. Revisá tu
          bandeja de entrada.
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="card mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-ink-muted">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              className="input-field mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            <Mail className="h-4 w-4" aria-hidden />
            {loading ? "Enviando…" : "Enviar magic link"}
          </button>
        </form>
      )}

      <div className="relative my-6">
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

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <p className="mt-8 text-center text-sm text-ink-faint">
        <Link href="/" className="hover:text-accent">
          ← Volver al inicio
        </Link>
      </p>
    </div>
  );
}
