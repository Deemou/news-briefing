import { NextResponse } from "next/server";
import { createSbUser, createSbAdmin } from "@/lib/supabase/server";

// 선택: 페이지당 개수/오프셋 쿼리 파싱
function getPaging(u: URL) {
  const limit = 10;
  const page = Math.max(parseInt(u.searchParams.get("page") || "1", 10), 1);
  const offset = (page - 1) * limit;
  return { limit, offset };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { limit, offset } = getPaging(url);

  // 1) 사용자 인증 (SSR 클라)
  const sbUser = createSbUser({ req });
  const {
    data: { user },
    error: uErr,
  } = await sbUser.auth.getUser();
  if (uErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) 데이터 읽기는 전부 admin (service role)
  const sb = createSbAdmin();

  // 2-1) 본인 링크 목록 (정렬 포함)
  const { data: links, error: linkErr } = await sb
    .from("user_summaries")
    .select(
      "id, summary_id, pinned, fallback_site, fallback_title, last_requested_at"
    )
    .eq("user_id", user.id)
    .order("pinned", { ascending: false })
    .order("last_requested_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  if (!links || links.length === 0) {
    return NextResponse.json({
      briefings: [],
      paging: { limit, offset, count: 0 },
    });
  }

  const ids = links.map((l) => l.summary_id);

  // 2-2) summaries IN 조회
  const { data: sums, error: sumErr } = await sb
    .from("summaries")
    .select("id, source_url, site, title, summary_text, created_at")
    .in("id", ids);

  if (sumErr) {
    return NextResponse.json({ error: sumErr.message }, { status: 500 });
  }

  // 2-3) 조합
  const byId = new Map((sums ?? []).map((s) => [s.id, s]));
  const briefings = links
    .map((l) => {
      const s = byId.get(l.summary_id);
      if (!s) return null;
      return {
        id: l.id,
        source_url: s.source_url,
        site: l.fallback_site ?? s.site,
        title: l.fallback_title ?? s.title,
        summary_text: s.summary_text,
        created_at: s.created_at,
        pinned: l.pinned ?? false,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    briefings,
    paging: { limit, offset, count: briefings.length },
  });
}
