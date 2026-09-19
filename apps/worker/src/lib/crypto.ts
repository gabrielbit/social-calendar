import { createDecipheriv } from "node:crypto";
import { loadConfig } from "../config.js";

/** Formato compartido con apps/api: iv.tag.ciphertext (base64). */
export function decryptTokens(encrypted: string): string {
  const { TOKEN_ENCRYPTION_KEY } = loadConfig();
  const key = Buffer.from(TOKEN_ENCRYPTION_KEY, "hex");
  const parts = encrypted.split(".");
  if (parts.length !== 3) {
    throw new Error("Formato de token cifrado inválido (esperado iv.tag.data)");
  }
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}
