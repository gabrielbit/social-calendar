const INSTAGRAM_HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactChannels = {
  allowContact: boolean;
  instagram: string | null;
  whatsapp: string | null;
  email: string | null;
};

export function normalizeInstagramHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  let raw = value.trim();
  raw = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  raw = raw.replace(/^@+/, "");
  raw = (raw.split(/[/?#]/)[0] ?? "").replace(/\/+$/, "");
  if (!INSTAGRAM_HANDLE_RE.test(raw)) return null;
  return raw;
}

export function normalizeWhatsAppPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("11")) digits = `549${digits}`;
  else if (digits.length === 10) digits = `54${digits}`;
  else if (digits.length === 11 && digits.startsWith("9")) digits = `54${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function normalizeContactEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return null;
  return email;
}

export function buildInstagramProfileUrl(handle: string): string {
  return `https://instagram.com/${handle}`;
}

export function buildWhatsAppMessageUrl(phone: string, text?: string): string {
  const base = `https://wa.me/${phone}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function buildMailtoUrl(email: string, subject?: string): string {
  if (!subject) return `mailto:${email}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export function hasPublicContact(contact: ContactChannels | null | undefined): boolean {
  if (!contact?.allowContact) return false;
  return Boolean(contact.instagram || contact.whatsapp || contact.email);
}
