const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
// 한글/영문/숫자/공백/일부 구두점만 허용
const WHITELIST = /[^0-9A-Za-z가-힣\s.,·:\-\/()[\]&'"]/g;

export interface SanitizeOptions {
  maxLen: number;
  allow?: RegExp; // 화이트리스트 보강이 필요할 때 교체 허용
}

export function sanitizeMetaRaw(
  input: unknown,
  { maxLen, allow = WHITELIST }: SanitizeOptions
) {
  if (typeof input !== "string") return null;
  let s = input.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();
  s = s.replace(allow, "");
  if (!s) return null;
  return s.slice(0, maxLen);
}

export function sanitizeTitle(input: unknown) {
  return sanitizeMetaRaw(input, { maxLen: 120 });
}

export function sanitizeSite(input: unknown) {
  return sanitizeMetaRaw(input, { maxLen: 50 });
}
