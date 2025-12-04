/**
 * KST 시간 헬퍼 (서버/DB 저장용)
 */
export function getKSTNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC + 9시간
}

export function getKSTNowISO(): string {
  return getKSTNow().toISOString();
}

export function getTodayKSTDateString(): string {
  return getKSTNow().toISOString().split("T")[0];
}
