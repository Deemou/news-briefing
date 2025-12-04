/**
 * 상대 시간 표시 (예: "방금 전", "3분 전", "2시간 전")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return formatAbsoluteDate(dateStr);
}

/**
 * 절대 날짜 표시 (예: "2025.12.04")
 */
const kstDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatAbsoluteDate(dateStr: string): string {
  return kstDateFormatter.format(new Date(dateStr)).replace(/\//g, ".");
}

/**
 * 시간 포함 날짜 표시 (예: "2025.12.04 15:44")
 */
const kstDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateTimeKST(dateStr: string): string {
  return kstDateTimeFormatter.format(new Date(dateStr));
}
