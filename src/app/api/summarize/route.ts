import { NextResponse } from "next/server";
import OpenAI from "openai";
import { callNewsExtractByUrl } from "@/lib/news-extract-api";
import { isValidHttpUrl } from "@/lib/validators/url";

const openai = new OpenAI({ apiKey: process.env.GPT_NEWS_API_KEY });

export const POST = async (req: Request) => {
  try {
    const { url, text } = await req.json();

    let baseText = "";

    if (isValidHttpUrl(url)) {
      try {
        const extracted = await callNewsExtractByUrl(url.trim(), {
          timeoutMs: 20000,
          retries: 2,
        });
        console.log(extracted);
        baseText =
          (typeof extracted?.text === "string" && extracted.text.trim()) || "";
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
      // 텍스트 경로
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

    // OpenAI 호출 (SDK)
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

    console.log(res);

    const summary = res.output_text?.trim?.() ?? "";
    if (!summary) {
      return NextResponse.json(
        { error: "요약을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary: summary.trim().slice(0, 800) });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};
