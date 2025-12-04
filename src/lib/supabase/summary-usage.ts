import { createSbAdmin } from "./server";
import { getKSTNowISO, getTodayKSTDateString } from "@/lib/utils/kstDate";

const sbAdmin = createSbAdmin();

export async function createTodaySummaryUsageRowIfNotExist(userId: string) {
  const today = getTodayKSTDateString();

  const { error } = await sbAdmin.from("summary_usage_daily").upsert(
    {
      user_id: userId,
      usage_date: today,
      used_count: 0,
      last_used_at: getKSTNowISO(),
    },
    {
      onConflict: "user_id,usage_date",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw error;
  }
}

export async function getTodaySummaryUsageCount(
  userId: string
): Promise<number> {
  const today = getTodayKSTDateString();

  await createTodaySummaryUsageRowIfNotExist(userId);

  const { data, error } = await sbAdmin
    .from("summary_usage_daily")
    .select("used_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("SummaryUsageDaily row missing");
  }

  return data.used_count;
}

export async function checkTodaySummaryUsageAllowed(
  userId: string,
  dailyLimit: number
): Promise<{ allowed: boolean; remainingCount: number }> {
  const usedCount = await getTodaySummaryUsageCount(userId);
  const remainingCount = Math.max(dailyLimit - usedCount, 0);

  return {
    allowed: remainingCount > 0,
    remainingCount,
  };
}
