/** Sanitize HTML for event descriptions — allowlist only. */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "h2",
  "h3",
  "blockquote",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
};

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  // Strip script/style/iframe and event handlers via regex (server-side first pass).
  let html = input
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button)[^>]*\/?\s*>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "");

  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    const closing = match.startsWith("</");
    if (!ALLOWED_TAGS.has(name)) return "";
    if (closing) return `</${name}>`;
    if (name === "br") return "<br />";

    const allowed = ALLOWED_ATTRS[name];
    if (!allowed) return `<${name}>`;

    const kept: string[] = [];
    const attrRe = /([a-z0-9:-]+)\s*=\s*(["'])(.*?)\2/gi;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(attrs))) {
      const key = m[1]!.toLowerCase();
      let val = m[3]!;
      if (!allowed.has(key)) continue;
      if (key === "href") {
        if (!/^(https?:|mailto:|tel:)/i.test(val)) continue;
        val = val.replace(/"/g, "&quot;");
        kept.push(`href="${val}" rel="noopener noreferrer" target="_blank"`);
        continue;
      }
      kept.push(`${key}="${val.replace(/"/g, "&quot;")}"`);
    }
    return kept.length ? `<${name} ${kept.join(" ")}>` : `<${name}>`;
  });

  return html.trim();
}
