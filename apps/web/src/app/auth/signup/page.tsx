"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { appUrl } from "@/lib/dates";
import { Container } from "@/components/layout/Container";
import { authErrorMessage } from "@/lib/auth-errors";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña tiene que tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: appUrl("/auth/callback"),
      },
    });
    setLoading(false);

    if (authError) {
      setError(authErrorMessage(authError.message));
      return;
    }

    if (data.session) {
      window.location.href = "/onboarding";
      return;
    }

    router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <Container className="flex min-h-[calc(100dvh-10rem)] items-center py-16">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="page-title">Crear cuenta</h1>
        <p className="page-lede mx-auto">
          Te mandamos un mail para confirmar. Google no necesita este paso.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
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
              minLength={8}
              autoComplete="new-password"
              className="input-field mt-1.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Repetir contraseña</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input-field mt-1.5"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creando…" : "Crear cuenta"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <p className="mt-8 text-sm text-ink-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href="/auth/login" className="text-ink hover:text-white">
            Entrar
          </Link>
        </p>
      </div>
    </Container>
  );
}
