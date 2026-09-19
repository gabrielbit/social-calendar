import { describe, expect, it } from "vitest";
import { sanitizeDescriptionHtml } from "../services/events.js";

describe("create event sanitization", () => {
  it("sanitizes description html via @agenda/domain before persistence", () => {
    const raw = `<p>Evento</p><script>alert("xss")</script><img onerror="alert(1)" src=x />`;
    const sanitized = sanitizeDescriptionHtml(raw);

    expect(sanitized).toContain("<p>Evento</p>");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onerror");
  });

  it("returns null for empty descriptions", () => {
    expect(sanitizeDescriptionHtml(undefined)).toBeNull();
    expect(sanitizeDescriptionHtml("")).toBeNull();
  });
});
