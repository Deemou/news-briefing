import { NextResponse } from "next/server";
import OpenAI from "openai";
import { callNewsExtractByUrl } from "@/lib/news-extract-api";
import { isValidHttpUrl } from "@/lib/validators/url";
import { createSbUser, createSbAdmin } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/utils/url";
import { normalizeText } from "@/lib/utils/text";
import { hashText } from "@/lib/utils/hash";
import { sanitizeTitle, sanitizeSite } from "@/lib/validators/meta";
import {
  performFallbackUpdate,
  incrementTodaySummaryUsageCount,
} from "@/lib/supabase/rpc";
import {
  acquireUserSummaryLock,
  releaseUserSummaryLock,
} from "@/lib/locks/summaryLock";
import { checkTodaySummaryUsageAllowed } from "@/lib/supabase/summary-usage";

const openai = new OpenAI({ apiKey: process.env.GPT_NEWS_API_KEY });

export const POST = async (req: Request) => {
  let userId: string | null = null;
  let lockToken: string | null = null;

  try {
    const { mode, url, text, title, site } = await req.json();

    // 0) 공통 URL 검증
    if (!isValidHttpUrl(url)) {
      return NextResponse.json(
        {
          error_code: "validation_failed",
          message: "유효한 URL이 필요합니다.",
        },
        { status: 400 }
      );
    }

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

    userId = user.id;

    const sbAdmin = createSbAdmin();

    // 2) 요약 한도 체크
    const DAILY_LIMIT = Number(process.env.SUMMARY_USAGE_DAILY_LIMIT);
    const { allowed, remainingCount } = await checkTodaySummaryUsageAllowed(
      user.id,
      DAILY_LIMIT
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error_code: "rate_limit_exceeded",
          message: "오늘 요약 가능 횟수를 모두 소진했습니다.",
          remaining: remainingCount,
        },
        { status: 429 }
      );
    }

    // 3) per-user 락
    const { acquired, token } = await acquireUserSummaryLock(user.id);

    if (!acquired || !token) {
      return NextResponse.json(
        {
          error_code: "concurrent_request",
          message:
            "요약 요청이 동시에 처리 중입니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 429 }
      );
    }

    lockToken = token;

    // 4) 요약 진행
    // URL 모드
    if (mode === "url") {
      const normalizedUrl = normalizeUrl(url.trim());

      // 본문 추출
      const extracted = await callNewsExtractByUrl(normalizedUrl, {
        timeoutMs: 60000,
        retries: 2,
      });

      if (!extracted.ok || !extracted.text?.trim()) {
        return NextResponse.json({ fallback: true }, { status: 200 });
      }

      const baseText = normalizeText(extracted.text.trim());
      const newHash = hashText(baseText);

      // exactSummary hit: URL+해시 동일 → 재사용 + 카운터 증가
      const { data: exactSummary } = await sbAdmin
        .from("summaries")
        .select("id, summary_text, total_requests")
        .eq("source_url", normalizedUrl)
        .eq("content_hash", newHash)
        .maybeSingle();

      if (exactSummary?.id) {
        await bumpCounters(
          sbAdmin,
          exactSummary.id,
          Number(exactSummary.total_requests ?? 0)
        );

        await linkUser(
          sbAdmin,
          user.id,
          exactSummary.id,
          normalizedUrl,
          null,
          null
        );

        await incrementTodaySummaryUsageCount(sbAdmin, user.id);

        return NextResponse.json(
          { summary: exactSummary.summary_text },
          { status: 200 }
        );
      }

      // 대표 정본 선택(업데이트 허용 경로)
      const { data: anyByUrl } = await sbAdmin
        .from("summaries")
        .select("id, total_requests")
        .eq("source_url", normalizedUrl)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 요약 생성
      let summary: string;

      try {
        summary = await summarize(baseText);
      } catch (e: any) {
        console.error("summarize_failed:url", {
          url: normalizedUrl,
          err: e?.message,
        });

        return NextResponse.json(
          {
            error_code: "summarize_failed",
            message: "요약을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          },
          { status: 502 }
        );
      }

      const metaSite = extracted.meta?.site ?? null;
      const metaTitle = extracted.title ?? null;
      const metaPublished = extracted.meta?.published_at ?? null;

      if (anyByUrl?.id) {
        const { error: upErr } = await sbAdmin
          .from("summaries")
          .update({
            summary_text: summary,
            content_hash: newHash,
            site: metaSite,
            title: metaTitle,
            article_published_at: metaPublished,
            total_requests: Number(anyByUrl.total_requests ?? 0) + 1,
            last_requested_at: new Date().toISOString(),
          })
          .eq("id", anyByUrl.id);

        if (upErr) {
          console.error("persist_failed:update:url", {
            id: anyByUrl.id,
            err: upErr,
          });

          return NextResponse.json(
            {
              error_code: "persist_failed",
              message: "요약 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            },
            { status: 500 }
          );
        }

        await linkUser(
          sbAdmin,
          user.id,
          anyByUrl.id,
          normalizedUrl,
          null,
          null
        );

        await incrementTodaySummaryUsageCount(sbAdmin, user.id);

        return NextResponse.json({ summary }, { status: 200 });
      }

      // 신규 생성(전역 정본 생성)
      const { data: inserted, error } = await sbAdmin
        .from("summaries")
        .insert({
          mode,
          source_url: normalizedUrl,
          site: metaSite,
          title: metaTitle,
          article_published_at: metaPublished,
          summary_text: summary,
          content_hash: newHash,
          generator_version: "v1",
          total_requests: 1,
          last_requested_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error || !inserted) {
        console.error("persist_failed:insert:url", {
          url: normalizedUrl,
          err: error,
        });

        return NextResponse.json(
          {
            error_code: "persist_failed",
            message: "요약 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          },
          { status: 500 }
        );
      }

      await linkUser(sbAdmin, user.id, inserted.id, normalizedUrl, null, null);
      await incrementTodaySummaryUsageCount(sbAdmin, user.id);

      return NextResponse.json({ summary }, { status: 200 });
    }

    // 텍스트 폴백 모드
    if (mode === "fallback") {
      const normalizedUrl = normalizeUrl(url.trim());
      const normalizedText = normalizeText(
        typeof text === "string" ? text : ""
      );

      if (!normalizedText) {
        return NextResponse.json(
          {
            error_code: "validation_failed",
            message: "요약할 본문이 없습니다.",
          },
          { status: 400 }
        );
      }

      if (normalizedText.length < 50) {
        return NextResponse.json(
          {
            error_code: "validation_failed",
            message: "본문이 너무 짧습니다. 최소 50자 이상 입력하세요.",
          },
          { status: 400 }
        );
      }

      if (normalizedText.length > 4000) {
        return NextResponse.json(
          {
            error_code: "validation_failed",
            message: "본문이 너무 깁니다. 최대 4,000자 이하로 입력하세요.",
          },
          { status: 400 }
        );
      }

      const safeTitle = sanitizeTitle(title);
      const safeSite = sanitizeSite(site);
      const hashedText = hashText(normalizedText);

      // 0) 내 기존 URL 링크 선조회(교체 판단용)
      const { data: existingLink } = await sbAdmin
        .from("user_summaries")
        .select("id, summary_id")
        .eq("user_id", user.id)
        .eq("source_url", normalizedUrl)
        .maybeSingle();

      // 1) 전역 exactSummary 재사용
      const { data: exactSummary } = await sbAdmin
        .from("summaries")
        .select("id, summary_text")
        .eq("source_url", normalizedUrl)
        .eq("content_hash", hashedText)
        .maybeSingle();

      if (exactSummary?.id) {
        await performFallbackUpdate(sbAdmin, {
          userId: user.id,
          sourceUrl: normalizedUrl,
          targetSummaryId: exactSummary.id,
          oldSummaryId: existingLink?.summary_id ?? null,
          fallbackTitle: safeTitle ?? normalizedText.slice(0, 120),
          fallbackSite: safeSite ?? safeHostname(normalizedUrl),
        });

        await incrementTodaySummaryUsageCount(sbAdmin, user.id);

        return NextResponse.json(
          { summary: exactSummary.summary_text },
          { status: 200 }
        );
      }

      // 2) exactSummary miss → 새 개인본 row 생성
      let summary: string;

      try {
        // summary = await summarize(normalizedText);
        summary = "Test Summary";
      } catch (e: any) {
        console.error("summarize_failed:text", {
          url: normalizedUrl,
          err: e?.message,
        });

        return NextResponse.json(
          {
            error_code: "summarize_failed",
            message: "요약 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          },
          { status: 502 }
        );
      }

      const { data: created, error: insertErr } = await sbAdmin
        .from("summaries")
        .insert({
          mode,
          source_url: normalizedUrl,
          site: null,
          title: null,
          article_published_at: null,
          summary_text: summary,
          content_hash: hashedText,
          generator_version: "v1",
          total_requests: 0,
          last_requested_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr || !created) {
        console.error("persist_failed:insert:text", {
          url: normalizedUrl,
          err: insertErr,
        });

        return NextResponse.json(
          {
            error_code: "persist_failed",
            message: "요약 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          },
          { status: 500 }
        );
      }

      await performFallbackUpdate(sbAdmin, {
        userId: user.id,
        sourceUrl: normalizedUrl,
        targetSummaryId: created.id,
        oldSummaryId: existingLink?.summary_id ?? null,
        fallbackTitle: safeTitle ?? normalizedText.slice(0, 120),
        fallbackSite: safeSite ?? safeHostname(normalizedUrl),
      });

      await incrementTodaySummaryUsageCount(sbAdmin, user.id);

      return NextResponse.json({ summary }, { status: 200 });
    }

    return NextResponse.json(
      { error_code: "invalid_mode", message: "invalid mode" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("route_unknown", err);

    return NextResponse.json(
      {
        error_code: "unknown",
        message: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  } finally {
    if (userId && lockToken) {
      await releaseUserSummaryLock(userId, lockToken);
    }
  }
};

// 합계 카운터(정본에만 증가)
async function bumpCounters(
  sbAdmin: ReturnType<typeof createSbAdmin>,
  summaryId: string,
  current: number
) {
  await sbAdmin
    .from("summaries")
    .update({
      total_requests: (current ?? 0) + 1,
      last_requested_at: new Date().toISOString(),
    })
    .eq("id", summaryId);
}

// 사용자 링크 upsert: user_id+source_url 기준
async function linkUser(
  sbAdmin: ReturnType<typeof createSbAdmin>,
  userId: string,
  summaryId: string,
  sourceUrl: string,
  fallbackTitle: string | null,
  fallbackSite: string | null
) {
  await sbAdmin.from("user_summaries").upsert(
    {
      user_id: userId,
      summary_id: summaryId,
      source_url: sourceUrl,
      fallback_title: fallbackTitle,
      fallback_site: fallbackSite,
      last_requested_at: new Date().toISOString(),
    },
    { onConflict: "user_id,source_url" }
  );
}

// OpenAI 요약
async function summarize(baseText: string): Promise<string> {
  const apiKey = process.env.GPT_NEWS_API_KEY;
  if (!apiKey) {
    throw new Error("서버에 API 키가 설정되어 있지 않습니다.");
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

  const summary = res.output_text?.trim?.() ?? "";
  if (!summary) {
    throw new Error("요약을 생성하지 못했습니다.");
  }

  return summary.slice(0, 800);
}

function safeHostname(u: string): string | null {
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}
