import { NextResponse } from "next/server";
import OpenAI from "openai";
import { callNewsExtractByUrl } from "@/lib/news-extract-api";
import { isValidHttpUrl } from "@/lib/validators/url";
import { createSbServer } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/utils/url";
import { normalizeText } from "@/lib/utils/text";
import { hashText } from "@/lib/utils/hash";

const openai = new OpenAI({ apiKey: process.env.GPT_NEWS_API_KEY });

export const POST = async (req: Request) => {
  try {
    const { url, text } = await req.json();

    const sb = createSbServer({ req, serviceRole: true });
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const useUrl = isValidHttpUrl(url);

    if (useUrl) {
      // 1) URL 경로: 정규화 → 전역 캐시 조회
      const norm = normalizeUrl(url.trim());

      const { data: found } = await sb
        .from("summaries")
        .select("id, summary_text, content_hash, total_requests")
        .eq("source_url", norm)
        .maybeSingle();

      // 2) 본문 추출
      const extracted = await callNewsExtractByUrl(norm, {
        timeoutMs: 60000,
        retries: 2,
      });
      const baseText = (extracted.text || "").trim();
      if (!baseText) {
        return NextResponse.json(
          { error: "기사에서 유효한 본문을 추출하지 못했습니다." },
          { status: 502 }
        );
      }
      const newHash = hashText(baseText);

      // 3) 캐시 히트 + 변경 없음 → 재사용
      if (found?.id && found.content_hash === newHash) {
        await bumpCounters(sb, found.id, found.total_requests ?? 0);
        await linkUser(sb, user.id, found.id);
        return NextResponse.json({ summary: found.summary_text });
      }

      // 4) 요약 생성(신규 혹은 변경됨)
      const summary = await summarize(baseText);

      if (found?.id) {
        // 변경됨 → 업데이트
        await sb
          .from("summaries")
          .update({
            summary_text: summary,
            content_hash: newHash,
            site: extracted.meta?.site || null,
            title: extracted.title || null,
            article_published_at: extracted.meta?.published_at || null,
            total_requests: (found.total_requests ?? 0) + 1,
            last_requested_at: new Date().toISOString(),
          })
          .eq("id", found.id);

        await linkUser(sb, user.id, found.id);
        return NextResponse.json({ summary });
      }

      // 5) 캐시 미스 → 신규 삽입
      const { data: inserted, error } = await sb
        .from("summaries")
        .insert({
          source_url: norm,
          site: extracted.meta?.site || null,
          title: extracted.title || null,
          article_published_at: extracted.meta?.published_at || null,
          summary_text: summary,
          content_hash: newHash,
          generator_version: "v1",
          total_requests: 1,
          last_requested_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error || !inserted) {
        return NextResponse.json(
          { error: "요약 저장에 실패했습니다." },
          { status: 500 }
        );
      }

      await linkUser(sb, user.id, inserted.id);
      return NextResponse.json({ summary });
    }

    // 6) 텍스트 경로: 정제 → 해시 → 전역 캐시 조회
    const t = typeof text === "string" ? normalizeText(text) : "";
    if (!t)
      return NextResponse.json(
        { error: "요약할 본문이 없습니다." },
        { status: 400 }
      );
    if (t.length < 50)
      return NextResponse.json(
        { error: "본문이 너무 짧습니다. 최소 50자 이상 입력하세요." },
        { status: 400 }
      );
    if (t.length > 4000)
      return NextResponse.json(
        { error: "본문이 너무 깁니다. 최대 4000자 이하로 입력하세요." },
        { status: 400 }
      );

    const h = hashText(t);

    const { data: existText } = await sb
      .from("summaries")
      .select("id, summary_text, total_requests")
      .eq("content_hash", h)
      .maybeSingle();

    if (existText?.id) {
      await bumpCounters(sb, existText.id, existText.total_requests ?? 0);
      await linkUser(sb, user.id, existText.id);
      return NextResponse.json({ summary: existText.summary_text });
    }

    const summary = await summarize(t);

    const { data: insertedText, error: insertErr } = await sb
      .from("summaries")
      .insert({
        source_url: null,
        site: null,
        title: null,
        article_published_at: null,
        summary_text: summary,
        content_hash: h,
        generator_version: "v1",
        total_requests: 1,
        last_requested_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !insertedText) {
      return NextResponse.json(
        { error: "요약 저장에 실패했습니다." },
        { status: 500 }
      );
    }

    await linkUser(sb, user.id, insertedText.id);
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};

// 공통: 카운터 증가 + 최근 시각 갱신
async function bumpCounters(
  sb: ReturnType<typeof createSbServer>,
  summaryId: string,
  current: number
) {
  await sb
    .from("summaries")
    .update({
      total_requests: (current ?? 0) + 1,
      last_requested_at: new Date().toISOString(),
    })
    .eq("id", summaryId);
}

// 공통: 사용자 링크 upsert
async function linkUser(
  sb: ReturnType<typeof createSbServer>,
  userId: string,
  summaryId: string
) {
  await sb.from("user_summaries").upsert(
    {
      user_id: userId,
      summary_id: summaryId,
      last_requested_at: new Date().toISOString(),
    },
    { onConflict: "user_id,summary_id" }
  );
}

// OpenAI 요약 함수
async function summarize(baseText: string): Promise<string> {
  const apiKey = process.env.GPT_NEWS_API_KEY;
  if (!apiKey) throw new Error("서버에 API 키가 설정되어 있지 않습니다.");

  const systemPrompt =
    "너는 한국어 뉴스 요약 전문가다. 추측/감탄/권유/메타 설명은 금지한다.";
  const userPrompt = [
    "다음 뉴스 기사를 350자 이내로 간결하게 요약해라.",
    "불필요한 수식어/중복 제거, 핵심 사실 유지.",
    "응답은 요약문만:",
    "",
    baseText,
  ].join("\n");

  const res = await openai.responses.create({
    model: "gpt-5-nano",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    reasoning: { effort: "minimal" },
    service_tier: "flex",
  });

  const summary = res.output_text?.trim?.() ?? "";
  if (!summary) throw new Error("요약을 생성하지 못했습니다.");
  return summary.slice(0, 800);
}
