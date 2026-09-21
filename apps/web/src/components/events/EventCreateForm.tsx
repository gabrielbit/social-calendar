"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateEventSchema, DEFAULT_TIMEZONE, slugify } from "@agenda/domain";
import { clientApiPost } from "@/lib/api-client";

const VISIBILITIES = [
  { value: "private", label: "Privado — solo vos" },
  { value: "shared", label: "Compartido — visible, no incorporable" },
  { value: "public", label: "Público — otros pueden sumarlo a su agenda" },
] as const;

type EventCreateFormProps = {
  defaultDate?: string;
  defaultContact?: {
    allowContact: boolean;
    instagram: string;
    whatsapp: string;
    email: string;
  };
};

export function EventCreateForm({ defaultDate, defaultContact }: EventCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allowContact, setAllowContact] = useState(defaultContact?.allowContact ?? true);
  const [contactInstagram, setContactInstagram] = useState(defaultContact?.instagram ?? "");
  const [contactWhatsapp, setContactWhatsapp] = useState(defaultContact?.whatsapp ?? "");
  const [contactEmail, setContactEmail] = useState(defaultContact?.email ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const title = String(fd.get("title") ?? "").trim();
    const startLocal = String(fd.get("startsAt") ?? "");
    const endLocal = String(fd.get("endsAt") ?? "");
    const tagsRaw = String(fd.get("tags") ?? "");
    const allDay = fd.get("allDay") === "on";

    const startsAt = new Date(startLocal).toISOString();
    const endsAt = new Date(endLocal).toISOString();

    const payload = {
      title,
      slug: slugify(title) || undefined,
      descriptionHtml: String(fd.get("description") ?? "") || undefined,
      visibility: String(fd.get("visibility") || "shared"),
      editorialStatus: "published",
      startsAt,
      endsAt,
      allDay,
      timezone: DEFAULT_TIMEZONE,
      rrule: String(fd.get("rrule") ?? "") || null,
      locationMode: String(fd.get("locationMode") || "physical"),
      siteUrl: String(fd.get("siteUrl") ?? "") || null,
      ticketsUrl: String(fd.get("ticketsUrl") ?? "") || null,
      isFree: fd.get("isFree") === "on",
      priceLabel: String(fd.get("priceLabel") ?? "") || null,
      coverImageUrl: String(fd.get("coverImageUrl") ?? "") || null,
      tagSlugs: tagsRaw
        .split(",")
        .map((t) => slugify(t.trim()))
        .filter(Boolean),
      linkedBirthday: fd.get("linkedBirthday") === "on",
      galleryUrls: [],
      language: "es",
      allowContact,
      contactInstagram: allowContact ? contactInstagram || null : null,
      contactWhatsapp: allowContact ? contactWhatsapp || null : null,
      contactEmail: allowContact ? contactEmail || null : null,
    };

    try {
      const parsed = CreateEventSchema.parse(payload);
      const result = await clientApiPost<{ event: { id: string }; occurrences: { id: string }[] }>(
        "/events",
        parsed,
      );
      const first = result.occurrences[0];
      if (first) router.push(`/e/${first.id}`);
      else router.push("/mi-agenda");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el evento");
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const preset = defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(defaultDate) ? new Date(`${defaultDate}T19:00:00`) : null;
  const defaultStart = preset ?? new Date(now.getTime() + 3600000);
  if (!preset) defaultStart.setMinutes(0, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 3600000);
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-5">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm text-ink-muted">
          Título
        </label>
        <input id="title" name="title" required className="input-field" placeholder="Clase de yoga al atardecer" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAt" className="mb-1.5 block text-sm text-ink-muted">
            Inicio
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            className="input-field"
            defaultValue={toLocal(defaultStart)}
          />
        </div>
        <div>
          <label htmlFor="endsAt" className="mb-1.5 block text-sm text-ink-muted">
            Fin
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            className="input-field"
            defaultValue={toLocal(defaultEnd)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="allDay" className="rounded border-border" />
        Todo el día
      </label>

      <div>
        <label htmlFor="visibility" className="mb-1.5 block text-sm text-ink-muted">
          Visibilidad
        </label>
        <select id="visibility" name="visibility" className="input-field" defaultValue="shared">
          {VISIBILITIES.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm text-ink-muted">
          Descripción (HTML simple permitido)
        </label>
        <textarea id="description" name="description" rows={4} className="input-field" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm text-ink-muted">
            Tags (separados por coma)
          </label>
          <input id="tags" name="tags" className="input-field" placeholder="yoga, pilates" />
        </div>
        <div>
          <label htmlFor="rrule" className="mb-1.5 block text-sm text-ink-muted">
            Recurrencia (RRULE opcional)
          </label>
          <input id="rrule" name="rrule" className="input-field" placeholder="FREQ=WEEKLY;INTERVAL=1" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="siteUrl" className="mb-1.5 block text-sm text-ink-muted">
            Sitio
          </label>
          <input id="siteUrl" name="siteUrl" type="url" className="input-field" />
        </div>
        <div>
          <label htmlFor="ticketsUrl" className="mb-1.5 block text-sm text-ink-muted">
            Entradas
          </label>
          <input id="ticketsUrl" name="ticketsUrl" type="url" className="input-field" />
        </div>
      </div>

      <div>
        <label htmlFor="coverImageUrl" className="mb-1.5 block text-sm text-ink-muted">
          Imagen principal (URL)
        </label>
        <input id="coverImageUrl" name="coverImageUrl" type="url" className="input-field" />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isFree" className="rounded border-border" />
          Gratis
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="linkedBirthday" className="rounded border-border" />
          Fiesta de cumpleaños (este año)
        </label>
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-border p-4">
        <legend className="px-1 text-sm text-ink-muted">Contacto de este evento</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowContact}
            onChange={(e) => setAllowContact(e.target.checked)}
          />
          Que puedan contactar por este evento
        </label>
        <p className="text-pretty text-xs text-ink-faint">
          Por defecto van tus datos de perfil. Si el evento no es tuyo, cambiá el Instagram, el
          WhatsApp o el email, o desmarcá el contacto.
        </p>
        {allowContact ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-ink-muted">Instagram</span>
              <input
                className="input-field mt-1"
                value={contactInstagram}
                onChange={(e) => setContactInstagram(e.target.value)}
                placeholder="@usuario"
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">WhatsApp</span>
              <input
                className="input-field mt-1"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                placeholder="+54 9 11 1234-5678"
                inputMode="tel"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Email</span>
              <input
                type="email"
                className="input-field mt-1"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hola@ejemplo.com"
              />
            </label>
          </div>
        ) : null}
      </fieldset>

      <input type="hidden" name="locationMode" value="physical" />
      <input type="hidden" name="priceLabel" value="" />

      {error ? (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Publicando…" : "Publicar evento"}
      </button>
    </form>
  );
}
