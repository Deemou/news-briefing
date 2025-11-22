import { redis } from "@/lib/redis";
import { randomUUID } from "crypto";

const SUMMARY_LOCK_PREFIX = "summary:lock:user:";
const LOCK_TTL_SECONDS = Number(process.env.SUMMARY_LOCK_TTL_SECONDS);

export async function acquireUserSummaryLock(
  userId: string
): Promise<{ acquired: boolean; token: string | null }> {
  const token = randomUUID();
  const key = `${SUMMARY_LOCK_PREFIX}${userId}`;

  // SET key value NX EX ttl
  const res = await redis.set(key, token, {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });

  // Upstash는 성공 시 'OK', 실패 시 null
  if (res === "OK") {
    return { acquired: true, token };
  }
  return { acquired: false, token: null };
}

export async function releaseUserSummaryLock(
  userId: string,
  token: string | null
): Promise<void> {
  if (!token) return;

  const key = `${SUMMARY_LOCK_PREFIX}${userId}`;
  const current = await redis.get<string>(key);
  if (current === token) {
    await redis.del(key);
  }
}
