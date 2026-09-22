"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateEventSchema, DEFAULT_TIMEZONE, slugify } from "@agenda/domain";
import { clientApiPatch, clientApiPost } from "@/lib/api-client";
import { EventDateTimePicker } from "@/components/events/EventDateTimePicker";
import { EventMediaField } from "@/components/events/EventMediaField";
import { RichTextEditor } from "@/components/events/RichTextEditor";
import { LocationAutocomplete } from "@/components/settings/LocationAutocomplete";
import { ensureEndsAfterStart, localDateAt, nextHourStart } from "@/lib/dates";

const VISIBILITIES = [
  { value: "private", label: "Privado — solo vos" },
  { value: "shared", label: "Compartido — visible, no incorporable" },
  { value: "public", label: "Público — otros pueden sumarlo a su agenda" },
] as const;

export type EventFormInitial = {
  id: string;
  title: string;
  description: string;
  visibility: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  rrule: string;
  locationLabel: string;
  siteUrl: string;
  ticketsUrl: string;
  isFree: boolean;
  priceLabel: string;
  linkedBirthday: boolean;
  tags: string;
  images: string[];
  allowContact: boolean;
  instagram: string;
  whatsapp: string;
  email: string;
};

type EventCreateFormProps = {
  defaultDate?: string;
  defaultContact?: {
    allowContact: boolean;
    instagram: string;
    whatsapp: string;
    email: string;
  };
  initial?: EventFormInitial;
};

const REPEAT_OPTIONS = [
  { value: "none", label: "No se repite" },
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
] as const;

type RepeatFreq = (typeof REPEAT_OPTIONS)[number]["value"];

function parseRrule(rrule: string | undefined): { freq: RepeatFreq; interval: number } {
  if (!rrule) return { freq: "none", interval: 1 };
  const freqRaw = /FREQ=(DAILY|WEEKLY|MONTHLY)/i.exec(rrule)?.[1]?.toUpperCase();
  const interval = Math.max(1, Number(/INTERVAL=(\d+)/i.exec(rrule)?.[1] ?? 1));
  if (freqRaw === "DAILY") return { freq: "daily", interval };
  if (freqRaw === "WEEKLY") return { freq: "weekly", interval };
  if (freqRaw === "MONTHLY") return { freq: "monthly", interval };
  return { freq: "none", interval: 1 };
}

function buildRrule(freq: RepeatFreq, interval: number): string | null {
  if (freq === "none") return null;
  const unit = freq === "daily" ? "DAILY" : freq === "weekly" ? "WEEKLY" : "MONTHLY";
  return interval > 1 ? `FREQ=${unit};INTERVAL=${interval}` : `FREQ=${unit}`;
}

function intervalUnit(freq: RepeatFreq, interval: number): string {
  if (freq === "daily") return interval === 1 ? "día" : "días";
  if (freq === "weekly") return interval === 1 ? "semana" : "semanas";
  return interval === 1 ? "mes" : "meses";
}

function initialRange(defaultDate?: string, initial?: EventFormInitial): { start: Date; end: Date } {
  if (initial) {
    return { start: new Date(initial.startsAt), end: new Date(initial.endsAt) };
  }
  const fromDay = defaultDate ? localDateAt(defaultDate, 19) : null;
  const start = fromDay ?? nextHourStart();
  return { start, end: new Date(start.getTime() + 3600000) };
}

export function EventCreateForm({ defaultDate, defaultContact, initial }: EventCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [{ start: startsAt, end: endsAt }, setRange] = useState(() => initialRange(defaultDate, initial));
  const [allDay, setAllDay] = useState(Boolean(initial?.allDay));
  const initialRepeat = parseRrule(initial?.rrule);
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq>(initialRepeat.freq);
  const [repeatInterval, setRepeatInterval] = useState(initialRepeat.interval);
  const [locationLabel, setLocationLabel] = useState(initial?.locationLabel ?? "");
  const [allowContact, setAllowContact] = useState(
    initial?.allowContact ?? defaultContact?.allowContact ?? true,
  );
  const [contactInstagram, setContactInstagram] = useState(
    initial?.instagram ?? defaultContact?.instagram ?? "",
  );
  const [contactWhatsapp, setContactWhatsapp] = useState(
    initial?.whatsapp ?? defaultContact?.whatsapp ?? "",
  );
  const [contactEmail, setContactEmail] = useState(initial?.email ?? defaultContact?.email ?? "");
  const [isFree, setIsFree] = useState(Boolean(initial?.isFree));
  const [descriptionHtml, setDescriptionHtml] = useState(initial?.description ?? "");
  const isEdit = Boolean(initial);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const title = String(fd.get("title") ?? "").trim();
    const tagsRaw = String(fd.get("tags") ?? "");
    const nextEnd = ensureEndsAfterStart(startsAt, endsAt);

    const payload = {
      title,
      slug: slugify(title) || undefined,
      descriptionHtml: descriptionHtml.trim() || undefined,
      visibility: String(fd.get("visibility") || "shared"),
      editorialStatus: "published",
      startsAt: startsAt.toISOString(),
      endsAt: nextEnd.toISOString(),
      allDay,
      timezone: DEFAULT_TIMEZONE,
      rrule: buildRrule(repeatFreq, repeatInterval),
      locationMode: String(fd.get("locationMode") || "physical"),
      locationLabel: locationLabel.trim() || null,
      siteUrl: String(fd.get("siteUrl") ?? "") || null,
      ticketsUrl: String(fd.get("ticketsUrl") ?? "") || null,
      isFree,
      priceLabel: isFree ? null : String(fd.get("priceLabel") ?? "").trim() || null,
      coverImageUrl: images[0] ?? null,
      tagSlugs: tagsRaw
        .split(",")
        .map((t) => slugify(t.trim()))
        .filter(Boolean),
      linkedBirthday: fd.get("linkedBirthday") === "on",
      galleryUrls: images.slice(1),
      language: "es",
      allowContact,
      contactInstagram: allowContact ? contactInstagram || null : null,
      contactWhatsapp: allowContact ? contactWhatsapp || null : null,
      contactEmail: allowContact ? contactEmail || null : null,
    };

    try {
      const parsed = CreateEventSchema.parse(payload);
      if (initial) {
        const result = await clientApiPatch<{ event: { id: string }; occurrences: { id: string }[] }>(
          `/events/${initial.id}`,
          parsed,
        );
        const first = result.occurrences[0];
        if (first) router.push(`/e/${first.id}`);
        else router.push("/mi-agenda");
      } else {
        const result = await clientApiPost<{ event: { id: string }; occurrences: { id: string }[] }>(
          "/events",
          parsed,
        );
        const first = result.occurrences[0];
        if (first) router.push(`/e/${first.id}`);
        else router.push("/mi-agenda");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "No se pudo guardar el evento" : "No se pudo crear el evento");
    } finally {
      setLoading(false);
    }
  }

  function handleStartChange(next: Date) {
    setRange((current) => ({
      start: next,
      end: ensureEndsAfterStart(next, current.end),
    }));
  }

  function handleEndChange(next: Date) {
    setRange((current) => ({
      start: current.start,
      end: ensureEndsAfterStart(current.start, next),
    }));
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-5">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm text-ink-muted">
          Título
        </label>
        <input
          id="title"
          name="title"
          required
          className="input-field"
          placeholder="Clase de yoga al atardecer"
          defaultValue={initial?.title}
        />
      </div>

      <EventMediaField
        images={images}
        onChange={setImages}
        onError={setError}
        onBusyChange={setUploading}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <EventDateTimePicker
          id="startsAt"
          label="Inicio"
          value={startsAt}
          allDay={allDay}
          onChange={handleStartChange}
        />
        <EventDateTimePicker
          id="endsAt"
          label="Fin"
          value={endsAt}
          allDay={allDay}
          onChange={handleEndChange}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="rounded border-border"
          checked={allDay}
          onChange={(event) => setAllDay(event.target.checked)}
        />
        Todo el día
      </label>

      <div>
        <label htmlFor="locationLabel" className="mb-1.5 block text-sm text-ink-muted">
          Lugar
        </label>
        <LocationAutocomplete
          id="locationLabel"
          name="locationLabel"
          value={locationLabel}
          onChange={setLocationLabel}
          placeholder="Bar, plaza o dirección"
        />
      </div>

      <div>
        <label htmlFor="visibility" className="mb-1.5 block text-sm text-ink-muted">
          Visibilidad
        </label>
        <select id="visibility" name="visibility" className="input-field" defaultValue={initial?.visibility ?? "shared"}>
          {VISIBILITIES.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm text-ink-muted">
          Descripción
        </label>
        <RichTextEditor
          id="description"
          value={descriptionHtml}
          onChange={setDescriptionHtml}
          placeholder="Contá de qué se trata… Podés pegar texto con formato."
        />
      </div>

      <div>
        <label htmlFor="tags" className="mb-1.5 block text-sm text-ink-muted">
          Tags (separados por coma)
        </label>
        <input
          id="tags"
          name="tags"
          className="input-field"
          placeholder="yoga, pilates"
          defaultValue={initial?.tags}
        />
      </div>

      <div className={repeatFreq === "none" ? "" : "grid gap-4 sm:grid-cols-2"}>
        <div>
          <label htmlFor="repeatFreq" className="mb-1.5 block text-sm text-ink-muted">
            Se repite
          </label>
          <select
            id="repeatFreq"
            className="input-field"
            value={repeatFreq}
            onChange={(event) => setRepeatFreq(event.target.value as RepeatFreq)}
          >
            {REPEAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {repeatFreq !== "none" ? (
          <div>
            <label htmlFor="repeatInterval" className="mb-1.5 block text-sm text-ink-muted">
              Cada
            </label>
            <div className="flex items-center gap-2">
              <select
                id="repeatInterval"
                className="input-field"
                value={repeatInterval}
                onChange={(event) => setRepeatInterval(Number(event.target.value))}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <span className="shrink-0 text-sm text-ink-muted">{intervalUnit(repeatFreq, repeatInterval)}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="siteUrl" className="mb-1.5 block text-sm text-ink-muted">
            Sitio web
          </label>
          <input
            id="siteUrl"
            name="siteUrl"
            type="url"
            className="input-field"
            placeholder="https://..."
            defaultValue={initial?.siteUrl}
          />
        </div>
        <div>
          <label htmlFor="ticketsUrl" className="mb-1.5 block text-sm text-ink-muted">
            Link para comprar entradas
          </label>
          <input
            id="ticketsUrl"
            name="ticketsUrl"
            type="url"
            className="input-field"
            placeholder="https://passline.com/..."
            defaultValue={initial?.ticketsUrl}
          />
          <p className="mt-1 text-pretty text-xs text-ink-faint">
            URL de Passline, Eventbrite u otro vendedor. Dejalo vacío si no hay venta.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="priceLabel" className="mb-1.5 block text-sm text-ink-muted">
            Precio
          </label>
          <input
            id="priceLabel"
            name="priceLabel"
            className="input-field"
            placeholder="$7.000 la clase"
            defaultValue={initial?.priceLabel}
            disabled={isFree}
            autoComplete="off"
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:mt-8">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={isFree}
            onChange={(event) => setIsFree(event.target.checked)}
          />
          Gratis
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="linkedBirthday"
          className="rounded border-border"
          defaultChecked={initial?.linkedBirthday}
        />
        Fiesta de cumpleaños (este año)
      </label>

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

      {error ? (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={loading || uploading}>
        {loading || uploading
          ? uploading
            ? "Subiendo imagen…"
            : isEdit
              ? "Guardando…"
              : "Publicando…"
          : isEdit
            ? "Guardar cambios"
            : "Publicar evento"}
      </button>
    </form>
  );
}
