import { NextResponse } from "next/server";
import { createSbUser } from "@/lib/supabase/server";
import { checkTodaySummaryUsageAllowed } from "@/lib/supabase/summary-usage";

export const GET = async (req: Request) => {
  // 1) 유저 인증
  const sbUser = createSbUser({ req });
  const {
    data: { user },
  } = await sbUser.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error_code: "unauthorized", message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  // 2) 남은 요약 횟수 조회
  const DAILY_LIMIT = Number(process.env.SUMMARY_USAGE_DAILY_LIMIT);
  const { remainingCount } = await checkTodaySummaryUsageAllowed(
    user.id,
    DAILY_LIMIT
  );

  return NextResponse.json({ remainingCount, limit: DAILY_LIMIT });
};
