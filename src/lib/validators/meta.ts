const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
// 위험한 HTML 태그 문자만 제거
const DANGEROUS_CHARS = /[<>]/g;

export const MAX_TITLE_LENGTH = 120;
export const MAX_SITE_LENGTH = 50;

export interface SanitizeOptions {
  maxLen: number;
}

export function sanitizeMetaRaw(input: unknown, { maxLen }: SanitizeOptions) {
  if (typeof input !== "string") return null;

  const sanitized = input
    .replace(CONTROL_CHARS, "") // 제어 문자 제거
    .replace(DANGEROUS_CHARS, "") // < > 제거
    .replace(/\s+/g, " ") // 연속 공백을 하나로
    .trim(); // 앞뒤 공백 제거

  if (!sanitized) return null;
  return sanitized.slice(0, maxLen);
}

export function sanitizeTitle(input: unknown) {
  return sanitizeMetaRaw(input, { maxLen: MAX_TITLE_LENGTH });
}

export function sanitizeSite(input: unknown) {
  return sanitizeMetaRaw(input, { maxLen: MAX_SITE_LENGTH });
}
