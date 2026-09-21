export function buildGoogleMapsUrl(query: string): string | null {
  const q = query.trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
