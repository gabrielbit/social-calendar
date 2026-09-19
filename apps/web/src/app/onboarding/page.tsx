"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProfileSchema, ProfileTypeSchema } from "@agenda/domain";
import { clientApiPost } from "@/lib/api-client";

const PROFILE_TYPES = ProfileTypeSchema.options;

const TYPE_LABELS: Record<string, string> = {
  person: "Persona",
  band: "Banda",
  collective: "Colectivo",
  producer: "Productor/a",
  venue: "Venue",
  organization: "Organización",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [profileType, setProfileType] = useState<string>("person");
  const [birthdayMonth, setBirthdayMonth] = useState("");
  const [birthdayDay, setBirthdayDay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      displayName,
      slug: slug || slugify(displayName),
      profileType,
      ...(birthdayMonth && birthdayDay
        ? {
            birthdayMonth: Number(birthdayMonth),
            birthdayDay: Number(birthdayDay),
          }
        : {}),
    };

    const parsed = CreateProfileSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Datos inválidos");
      return;
    }

    setLoading(true);
    try {
      await clientApiPost("/profiles/onboarding", parsed.data);
      router.push(`/a/${parsed.data.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear perfil");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-ink">Configurá tu perfil</h1>
      <p className="mt-2 text-ink-muted">
        Tu agenda pública empieza acá. El cumpleaños es opcional (solo día y mes, nunca el año).
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-ink-muted">Nombre para mostrar</span>
          <input
            required
            className="input-field mt-1"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-ink-muted">Slug (URL)</span>
          <div className="mt-1 flex items-center gap-1 text-sm text-ink-faint">
            <span>/a/</span>
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className="input-field flex-1"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
            />
          </div>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-ink-muted">Tipo de perfil</span>
          <select
            className="input-field mt-1"
            value={profileType}
            onChange={(e) => setProfileType(e.target.value)}
          >
            {PROFILE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="text-sm">
          <legend className="font-medium text-ink-muted">Cumpleaños (opcional)</legend>
          <div className="mt-2 flex gap-3">
            <label className="flex-1">
              <span className="sr-only">Mes</span>
              <select
                className="input-field"
                value={birthdayMonth}
                onChange={(e) => setBirthdayMonth(e.target.value)}
              >
                <option value="">Mes</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-24">
              <span className="sr-only">Día</span>
              <select
                className="input-field"
                value={birthdayDay}
                onChange={(e) => setBirthdayDay(e.target.value)}
              >
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creando…" : "Crear perfil"}
        </button>
      </form>
    </div>
  );
}
