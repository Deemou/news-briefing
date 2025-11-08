import { setTimeout as delay } from "timers/promises";

const EXTRACT_API_URL = process.env.NEWS_EXTRACT_API_URL!;
const EXTRACT_API_KEY = process.env.NEWS_EXTRACT_API_KEY!;

if (!EXTRACT_API_URL) throw new Error("NEWS_EXTRACT_API_URL missing");
if (!EXTRACT_API_KEY) throw new Error("NEWS_EXTRACT_API_KEY missing");

function jitter(ms: number) {
  const delta = Math.floor(ms * 0.2);
  return ms + Math.floor(Math.random() * delta);
}

export type ExtractResult = {
  ok: boolean;
  status?: number;
  title: string | null;
  text: string;
  meta: {
    source: string | null;
    published_at: string | null;
    site: string | null;
  };
  error?: string;
};

export async function callNewsExtractByUrl(
  url: string,
  opts?: { timeoutMs?: number; retries?: number }
): Promise<ExtractResult> {
  const timeoutMs = opts?.timeoutMs ?? 20000;
  const retries = opts?.retries ?? 2;

  let attempt = 0;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    while (true) {
      const res = await fetch(EXTRACT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": EXTRACT_API_KEY,
        },
        body: JSON.stringify({ url }),
        signal: ctrl.signal,
        cache: "no-store",
      });

      // 성공 + 본문 유효
      if (res.ok) {
        const data = (await res.json()) as Omit<ExtractResult, "ok" | "status">;
        const text = (data.text || "").trim();
        if (text.length > 0) {
          return { ...data, ok: true, status: res.status };
        }
        // 본문 비어있음 → 폴백 유도
        return {
          ok: false,
          status: res.status,
          title: data.title ?? null,
          text: "",
          meta: data.meta ?? { source: null, published_at: null, site: null },
          error: "empty_text",
        };
      }

      // 재시도 대상
      if ((res.status === 429 || res.status === 503) && attempt < retries) {
        const retryAfter = res.headers.get("Retry-After");
        if (retryAfter && /^\d+$/.test(retryAfter)) {
          await delay(parseInt(retryAfter, 10) * 1000);
        } else {
          const backoff = jitter(2 ** attempt * 1000);
          await delay(backoff);
        }
        attempt += 1;
        continue;
      }

      // 폴백 대상(401/403/404 등 클라이언트·권한·존재 오류)
      if ([401, 403, 404].includes(res.status)) {
        const errText = await res.text().catch(() => "");
        return {
          ok: false,
          status: res.status,
          title: null,
          text: "",
          meta: { source: null, published_at: null, site: null },
          error: errText || "upstream_error",
        };
      }

      // 그 외 서버 오류는 에러로 올림(라우트에서 try-catch로 처리 가능)
      const errText = await res.text().catch(() => "");
      throw new Error(`News Extract API error ${res.status}: ${errText}`);
    }
  } finally {
    clearTimeout(t);
  }
}
