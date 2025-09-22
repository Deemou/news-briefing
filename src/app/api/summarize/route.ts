import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const minLen = 50;
    const maxLen = 4000;

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "본문 텍스트가 없습니다." },
        { status: 400 }
      );
    }

    const length = text.trim().length;

    if (length < minLen) {
      return NextResponse.json(
        { error: `본문이 너무 짧습니다. 최소 ${minLen}자 이상 입력하세요.` },
        { status: 400 }
      );
    }

    if (length > maxLen) {
      return NextResponse.json(
        { error: `본문이 너무 깁니다. 최대 ${maxLen}자 이하로 입력하세요.` },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "서버에 API 키가 설정되어 있지 않습니다." },
        { status: 500 }
      );
    }

    // 모델의 역할·톤·제약 같은 기본 행동 규칙을 설정하는 “상위 지침”
    const systemPrompt =
      "너는 한국어 뉴스 요약 전문가다. 정보 왜곡 없이 핵심만 간결하게 정리한다.";
    // 당장의 작업 지시와 입력 데이터를 담는 “요청 내용”
    const userPrompt = [
      "다음 뉴스 기사를 3~4문장, 350자 내외로 간결하게 요약해라.",
      "불필요한 수식어/중복 제거, 핵심 사실 유지.",
      "응답은 요약문만:",
      "",
      text.trim(),
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_output_tokens: 220,
      }),
    });

    if (!res.ok) {
      // 원문 에러는 로깅만, 클라이언트엔 안전 메시지
      const errText = await res.text();
      console.error("OpenAI error:", errText);
      return NextResponse.json(
        { error: "요약 생성 요청이 실패했습니다. 잠시 후 다시 시도하세요." },
        { status: res.status }
      );
    }

    const data = await res.json();
    // Responses API: output_text 헬퍼가 있거나, items에서 message 찾아 파싱
    const summary =
      data.output_text ?? data?.output?.[0]?.content?.[0]?.text ?? null;

    if (!summary || typeof summary !== "string") {
      return NextResponse.json(
        { error: "요약을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    // 후처리: 너무 길면 자르기
    const clean = summary.trim().slice(0, 800);

    return NextResponse.json({ summary: clean });
  } catch (err: any) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
