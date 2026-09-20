export const PROFILE_TYPE_LABELS: Record<string, string> = {
  person: "Persona",
  band: "Banda",
  collective: "Colectivo",
  producer: "Productor/a",
  venue: "Espacio",
  organization: "Organización",
};

export function profileTypeLabel(type: string): string {
  return PROFILE_TYPE_LABELS[type] ?? type;
}