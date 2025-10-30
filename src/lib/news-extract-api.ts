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
  title: string | null;
  text: string;
  meta: {
    source: string | null;
    published_at: string | null;
    site: string | null;
  };
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

      if (res.ok) return (await res.json()) as ExtractResult;

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

      const errText = await res.text().catch(() => "");
      throw new Error(`News Extract API error ${res.status}: ${errText}`);
    }
  } finally {
    clearTimeout(t);
  }
}
