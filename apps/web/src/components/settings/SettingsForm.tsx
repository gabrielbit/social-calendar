"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Calendar, Save } from "lucide-react";
import { BirthdayVisibilitySchema } from "@agenda/domain";
import { clientApiPost } from "@/lib/api-client";
import { appUrl } from "@/lib/dates";

type SettingsFormProps = {
  profile?: {
    display_name: string;
    slug: string;
    bio: string | null;
    birthday_month: number | null;
    birthday_day: number | null;
    birthday_visibility: string;
    public_location: string | null;
  };
  prefs?: {
    home_zone: string | null;
    notify_email: boolean;
    notify_birthdays: boolean;
  };
  googleConnected: boolean;
};

const VISIBILITY_LABELS: Record<string, string> = {
  hidden: "Oculto",
  followers: "Solo seguidores",
  public: "Público",
};

export function SettingsForm({ profile, prefs, googleConnected }: SettingsFormProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [publicLocation, setPublicLocation] = useState(profile?.public_location ?? "");
  const [birthdayMonth, setBirthdayMonth] = useState(String(profile?.birthday_month ?? ""));
  const [birthdayDay, setBirthdayDay] = useState(String(profile?.birthday_day ?? ""));
  const [birthdayVisibility, setBirthdayVisibility] = useState(
    profile?.birthday_visibility ?? "followers",
  );
  const [homeZone, setHomeZone] = useState(prefs?.home_zone ?? "");
  const [notifyEmail, setNotifyEmail] = useState(prefs?.notify_email ?? true);
  const [notifyBirthdays, setNotifyBirthdays] = useState(prefs?.notify_birthdays ?? true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGoogleConnect() {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/calendar/google/connect?returnTo=${encodeURIComponent(appUrl("/settings"))}`;
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await clientApiPost("/profiles/me", {
          displayName,
          bio: bio || undefined,
          publicLocation: publicLocation || undefined,
          birthdayMonth: birthdayMonth ? Number(birthdayMonth) : null,
          birthdayDay: birthdayDay ? Number(birthdayDay) : null,
          birthdayVisibility,
        });
        await clientApiPost("/preferences/me", {
          homeZone: homeZone || undefined,
          notifyEmail,
          notifyBirthdays,
        });
        setMessage("Cambios guardados");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="card mt-6 space-y-5">
      {profile?.slug && (
        <p className="text-sm text-ink-muted">
          Tu agenda:{" "}
          <Link href={`/a/${profile.slug}`} className="font-medium text-accent">
            /a/{profile.slug}
          </Link>
        </p>
      )}

      <label className="block text-sm">
        <span className="font-medium text-ink-muted">Nombre</span>
        <input
          className="input-field mt-1"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-ink-muted">Bio</span>
        <textarea
          className="input-field mt-1 min-h-[80px]"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-ink-muted">Ubicación pública</span>
        <input
          className="input-field mt-1"
          value={publicLocation}
          onChange={(e) => setPublicLocation(e.target.value)}
        />
      </label>

      <fieldset className="text-sm">
        <legend className="font-medium text-ink-muted">Cumpleaños (día y mes)</legend>
        <div className="mt-2 flex gap-3">
          <select
            className="input-field flex-1"
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
          <select
            className="input-field w-24"
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
        </div>
        <label className="mt-2 block">
          <span className="font-medium text-ink-muted">Visibilidad</span>
          <select
            className="input-field mt-1"
            value={birthdayVisibility}
            onChange={(e) => setBirthdayVisibility(e.target.value)}
          >
            {BirthdayVisibilitySchema.options.map((v) => (
              <option key={v} value={v}>
                {VISIBILITY_LABELS[v] ?? v}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className="text-sm">
        <legend className="font-medium text-ink-muted">Preferencias</legend>
        <label className="mt-2 block">
          <span className="text-ink-muted">Zona habitual</span>
          <input
            className="input-field mt-1"
            value={homeZone}
            onChange={(e) => setHomeZone(e.target.value)}
          />
        </label>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
          />
          Notificaciones por email
        </label>
        <label className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyBirthdays}
            onChange={(e) => setNotifyBirthdays(e.target.checked)}
          />
          Recordatorios de cumpleaños
        </label>
      </fieldset>

      <div className="rounded-lg border border-border bg-canvas p-4">
        <p className="text-sm font-medium text-ink">Google Calendar</p>
        <p className="mt-1 text-xs text-ink-muted">
          Sincronizá eventos marcados como «Voy» en un calendario secundario.
        </p>
        <button
          type="button"
          onClick={handleGoogleConnect}
          className="btn-secondary mt-3 text-sm"
        >
          <Calendar className="h-4 w-4" aria-hidden />
          {googleConnected ? "Reconectar Google" : "Conectar Google Calendar"}
        </button>
      </div>

      {message && (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        <Save className="h-4 w-4" aria-hidden />
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
