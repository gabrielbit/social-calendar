"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LogOut, Save } from "lucide-react";
import { BirthdayVisibilitySchema, type AgentProvider } from "@agenda/domain";
import { clientApiGet, clientApiPatch } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { GoogleCalendarIcon } from "@/components/icons/GoogleCalendarIcon";
import { LocationAutocomplete } from "@/components/settings/LocationAutocomplete";
import { AgentMark } from "@/components/agent/AgentMark";

type SettingsFormProps = {
  profile?: {
    display_name: string;
    slug: string;
    bio: string | null;
    birthday_month: number | null;
    birthday_day: number | null;
    birthday_visibility: string;
    public_location: string | null;
    instagram_handle: string | null;
    whatsapp_phone: string | null;
    contact_email: string | null;
    allow_contact: boolean;
  };
  prefs?: {
    home_zone: string | null;
    notify_email: boolean;
    notify_birthdays: boolean;
    agent_provider?: string | null;
  };
  googleConnected: boolean;
  agentEnabled?: boolean;
};

const VISIBILITY_LABELS: Record<string, string> = {
  hidden: "Oculto",
  followers: "Solo seguidores",
  public: "Público",
};

const PROVIDER_OPTIONS: { value: AgentProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Claude (Anthropic)" },
  { value: "deepseek", label: "DeepSeek" },
];

export function SettingsForm({
  profile,
  prefs,
  googleConnected,
  agentEnabled = false,
}: SettingsFormProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [publicLocation, setPublicLocation] = useState(profile?.public_location ?? "");
  const [allowContact, setAllowContact] = useState(profile?.allow_contact ?? true);
  const [instagramHandle, setInstagramHandle] = useState(profile?.instagram_handle ?? "");
  const [whatsappPhone, setWhatsappPhone] = useState(profile?.whatsapp_phone ?? "");
  const [contactEmail, setContactEmail] = useState(profile?.contact_email ?? "");
  const [birthdayMonth, setBirthdayMonth] = useState(String(profile?.birthday_month ?? ""));
  const [birthdayDay, setBirthdayDay] = useState(String(profile?.birthday_day ?? ""));
  const [birthdayVisibility, setBirthdayVisibility] = useState(
    profile?.birthday_visibility ?? "followers",
  );
  const [homeZone, setHomeZone] = useState(prefs?.home_zone ?? "");
  const [notifyEmail, setNotifyEmail] = useState(prefs?.notify_email ?? true);
  const [notifyBirthdays, setNotifyBirthdays] = useState(prefs?.notify_birthdays ?? true);
  const [agentProvider, setAgentProvider] = useState<AgentProvider>(
    prefs?.agent_provider === "anthropic" || prefs?.agent_provider === "deepseek"
      ? prefs.agent_provider
      : "openai",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
    });
  }

  function handleGoogleConnect() {
    startTransition(async () => {
      setError(null);
      try {
        const { url } = await clientApiGet<{ url: string }>("/calendar/google/connect");
        window.location.href = url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo iniciar Google Calendar");
      }
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await clientApiPatch("/profiles/me", {
          displayName,
          bio: bio || undefined,
          publicLocation: publicLocation || undefined,
          birthdayMonth: birthdayMonth ? Number(birthdayMonth) : null,
          birthdayDay: birthdayDay ? Number(birthdayDay) : null,
          birthdayVisibility,
          allowContact,
          instagramHandle: instagramHandle || null,
          whatsappPhone: whatsappPhone || null,
          contactEmail: contactEmail || null,
        });
        await clientApiPatch("/preferences/me", {
          homeZone: homeZone || undefined,
          notifyEmail,
          notifyBirthdays,
          ...(agentEnabled ? { agentProvider } : {}),
        });
        setMessage("Cambios guardados");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="mt-8 space-y-5">
      {profile?.slug && (
        <p className="text-sm text-ink-muted">
          Tu agenda:{" "}
          <Link href={`/a/${profile.slug}`} className="font-medium text-accent">
            /a/{profile.slug}
          </Link>
        </p>
      )}

      <label className="block text-sm">
        <span className="text-ink-muted">Nombre</span>
        <input
          className="input-field mt-1"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="text-ink-muted">Bio</span>
        <textarea
          className="input-field mt-1 min-h-[80px]"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </label>

      <div className="text-sm">
        <label htmlFor="public-location" className="text-ink-muted">
          Ubicación pública
        </label>
        <LocationAutocomplete
          id="public-location"
          value={publicLocation}
          onChange={setPublicLocation}
        />
      </div>

      <fieldset className="space-y-3 text-sm">
        <legend className="text-ink-muted">Contacto</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowContact}
            onChange={(e) => setAllowContact(e.target.checked)}
          />
          Quiero que me contacten
        </label>
        <p className="text-pretty text-xs text-ink-faint">
          Estos datos se usan por defecto en tus eventos. En cada evento podés cambiarlos o
          apagarlos.
        </p>
        <label className="block">
          <span className="text-ink-muted">Instagram</span>
          <input
            className="input-field mt-1"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="@usuario"
            autoComplete="off"
            disabled={!allowContact}
          />
        </label>
        <label className="block">
          <span className="text-ink-muted">WhatsApp</span>
          <input
            className="input-field mt-1"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            placeholder="+54 9 11 1234-5678"
            inputMode="tel"
            autoComplete="tel"
            disabled={!allowContact}
          />
        </label>
        <label className="block">
          <span className="text-ink-muted">Email de contacto</span>
          <input
            type="email"
            className="input-field mt-1"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="hola@ejemplo.com"
            autoComplete="email"
            disabled={!allowContact}
          />
        </label>
      </fieldset>

      <fieldset className="text-sm">
        <legend className="text-ink-muted">Cumpleaños (día y mes)</legend>
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
          <span className="text-ink-muted">Visibilidad</span>
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
        <legend className="text-ink-muted">Preferencias</legend>
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

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-ink">Google Calendar</p>
        <p className="mt-1 text-xs text-ink-muted">
          Sincronizá eventos marcados como «Voy» en un calendario secundario.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={handleGoogleConnect}
          className="btn-secondary mt-3 text-sm"
        >
          <GoogleCalendarIcon className="size-4" />
          {googleConnected ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
        </button>
      </div>

      {agentEnabled && (
        <div className="rounded-2xl border border-agent/30 bg-agent-soft/40 p-4">
          <div className="flex items-center gap-2">
            <AgentMark size="sm" />
            <p className="text-sm font-medium text-ink">Asistente</p>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Modelo para crear eventos desde texto o imágenes. DeepSeek no lee flyers con imagen.
          </p>
          <label className="mt-3 block text-sm">
            <span className="text-ink-muted">Modelo</span>
            <select
              className="input-field mt-1"
              value={agentProvider}
              onChange={(e) => setAgentProvider(e.target.value as AgentProvider)}
            >
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {message && (
        <p className="text-sm text-emerald-400" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        <Save className="h-4 w-4" aria-hidden />
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={handleLogout}
        className="btn-secondary w-full"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Cerrar sesión
      </button>
    </form>
  );
}
