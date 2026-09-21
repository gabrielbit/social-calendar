import { createClient } from "@/lib/supabase/client";

export const MAX_EVENT_IMAGES = 12;
export const MAX_EVENT_IMAGE_BYTES = 8 * 1024 * 1024;

export function imageFromClipboard(event: ClipboardEvent): File | null {
  const data = event.clipboardData;
  if (!data) return null;

  for (const file of Array.from(data.files)) {
    if (file.type.startsWith("image/")) return file;
  }

  for (const item of Array.from(data.items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }

  return null;
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return map[file.type] ?? "jpg";
}

export async function uploadEventImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Eso no es una imagen");
  }
  if (file.size > MAX_EVENT_IMAGE_BYTES) {
    throw new Error("La imagen pesa más de 8 MB");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tenés que iniciar sesión");

  const path = `${user.id}/events/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message || "No se pudo subir la imagen");

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}
