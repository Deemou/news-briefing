import { NextResponse } from "next/server";
import OpenAI from "openai";
import { callNewsExtractByUrl } from "@/lib/news-extract-api";
import { isValidHttpUrl } from "@/lib/validators/url";
import { createSbServer } from "@/lib/supabase/server";
import type { SummaryInsert, UserSummaryInsert } from "@/types/db";

const openai = new OpenAI({ apiKey: process.env.GPT_NEWS_API_KEY });

export const POST = async (req: Request) => {
  try {
    const { url, text } = await req.json();

    const sb = createSbServer({ req });
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    let baseText = "";
    let metadata: {
      source_url: string | null;
      site: string | null;
      title: string | null;
      published_at: string | null;
    } = {
      source_url: null,
      site: null,
      title: null,
      published_at: null,
    };

    // URL 또는 텍스트 처리
    if (isValidHttpUrl(url)) {
      try {
        const extracted = await callNewsExtractByUrl(url.trim(), {
          timeoutMs: 60000,
          retries: 2,
        });
        console.log("Extracted:", extracted);

        baseText = extracted.text?.trim() || "";

        metadata = {
          source_url: extracted.meta?.source || url.trim(),
          site: extracted.meta?.site || null,
          title: extracted.title || null,
          published_at: extracted.meta?.published_at || null,
        };
      } catch (e) {
        console.error("News Extract API call failed:", e);
        return NextResponse.json(
          { error: "기사 추출에 실패했습니다. 잠시 후 다시 시도하세요." },
          { status: 502 }
        );
      }
      if (!baseText) {
        return NextResponse.json(
          { error: "기사에서 유효한 본문을 추출하지 못했습니다." },
          { status: 502 }
        );
      }
    } else {
      // 텍스트 직접 입력
      const minLen = 50;
      const maxLen = 4000;
      const t = typeof text === "string" ? text.trim() : "";
      if (!t) {
        return NextResponse.json(
          { error: "요약할 본문이 없습니다." },
          { status: 400 }
        );
      }
      if (t.length < minLen) {
        return NextResponse.json(
          { error: `본문이 너무 짧습니다. 최소 ${minLen}자 이상 입력하세요.` },
          { status: 400 }
        );
      }
      if (t.length > maxLen) {
        return NextResponse.json(
          { error: `본문이 너무 깁니다. 최대 ${maxLen}자 이하로 입력하세요.` },
          { status: 400 }
        );
      }
      baseText = t;
    }

    // OpenAI 요약 생성
    const apiKey = process.env.GPT_NEWS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "서버에 API 키가 설정되어 있지 않습니다." },
        { status: 500 }
      );
    }

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

    console.log("OpenAI response:", res);

    const summary = res.output_text?.trim?.() ?? "";
    if (!summary) {
      return NextResponse.json(
        { error: "요약을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    const finalSummary = summary.trim().slice(0, 800);

    // DB 저장 (실패해도 요약은 반환)
    try {
      const summaryData: SummaryInsert = {
        created_by: user.id,
        source_url: metadata.source_url,
        site: metadata.site,
        title: metadata.title,
        article_published_at: metadata.published_at,
        article_text: baseText.slice(0, 10000),
        summary_text: finalSummary,
        generator_version: "v1",
      };

      const { data: summaryRow, error: summaryError } = await sb
        .from("summaries")
        .insert(summaryData)
        .select("id")
        .single();

      if (summaryError || !summaryRow) {
        console.error("Summary insert error:", summaryError);
      } else {
        // summary 저장 성공 시에만 관계 테이블 저장
        const userSummaryData: UserSummaryInsert = {
          user_id: user.id,
          summary_id: summaryRow.id,
          pinned: false,
        };

        const { error: userSummaryError } = await sb
          .from("user_summaries")
          .insert(userSummaryData);

        if (userSummaryError) {
          console.error("UserSummary insert error:", userSummaryError);
        }
      }
    } catch (dbError: any) {
      console.error("Database error:", dbError);
    }

    // 저장 성공/실패 무관하게 요약 반환
    return NextResponse.json({ summary: finalSummary });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};
