const SECTION_KEY = "agenda-return-section";

export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.split("#")[0]?.trim() ?? "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) {
    return null;
  }
  if (path.startsWith("/auth") || path.startsWith("/events/")) return null;
  return path;
}

export function rememberSection(pathname: string) {
  if (typeof window === "undefined") return;
  if (!pathname || pathname.startsWith("/e/") || pathname.startsWith("/events/")) return;
  const safe = safeReturnPath(pathname);
  if (safe) sessionStorage.setItem(SECTION_KEY, safe);
}

export function rememberedSection(): string {
  if (typeof window === "undefined") return "/";
  return safeReturnPath(sessionStorage.getItem(SECTION_KEY)) ?? "/";
}

export function returnToLabel(path: string): string {
  if (path === "/" || path.startsWith("/?")) return "Volver al calendario";
  if (path.startsWith("/explorar")) return "Volver a explorar";
  if (path.startsWith("/mi-agenda")) return "Volver a la lista";
  if (path.startsWith("/a/")) return "Volver a la agenda";
  if (path.startsWith("/e/")) return "Volver al evento";
  if (path.startsWith("/settings")) return "Volver a ajustes";
  return "Volver";
}
