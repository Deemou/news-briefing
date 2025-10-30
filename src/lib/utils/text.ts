export function normalizeText(raw: string): string {
  let s = raw ?? "";
  s = s.replace(/\r\n?/g, "\n"); // CRLF/CR -> LF
  s = s.replace(/\t/g, " "); // tabs -> space
  s = s.replace(/[^\S\r\n]+/g, " "); // collapse spaces except newlines
  s = s.replace(/\n{3,}/g, "\n\n"); // collapse too many newlines
  // remove control except \n and \t already handled
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  // Unicode NFC
  if ((globalThis as any).Intl?.Collator) {
    s = s.normalize("NFC");
  }
  return s.trim();
}
