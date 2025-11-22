"use client";

import { useState, useCallback, useEffect } from "react";
import { isValidHttpUrl } from "@/lib/validators/url";
import Button from "@/components/ui/Button";
import { SummarizeRequest } from "@/types/summarize";
import { sanitizeTitle, sanitizeSite } from "@/lib/validators/meta";

const minLen = 50;
const maxLen = 4000;

export default function SummaryPage() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  const tlen = text.trim().length;
  const urlMode = !fallbackMode;
  const urlValid = isValidHttpUrl(url);
  const isTooShort = tlen > 0 && tlen < minLen;
  const isTooLong = tlen > maxLen;
  const isValidText = !isTooShort && !isTooLong;

  const canSubmit = (urlMode ? urlValid : isValidText) && !isSubmitting;

  // 한도 정보 fetch
  useEffect(() => {
    fetch("/api/get-summary-usage")
      .then((res) => res.json())
      .then((data) => {
        if (data?.remainingCount !== undefined && data?.limit !== undefined) {
          setRemaining(data.remainingCount);
          setLimit(data.limit);
        } else {
          setUsageError("잔여 요약 한도 정보를 불러오지 못했습니다.");
        }
      })
      .catch(() => {
        setUsageError("잔여 요약 한도 정보를 불러오지 못했습니다.");
      });
  }, []);

  const refreshSummaryUsage = useCallback(() => {
    fetch("/api/get-summary-usage")
      .then((res) => res.json())
      .then((data) => {
        setRemaining(data.remainingCount);
        setLimit(data.limit);
      });
  }, []);

  const onUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setUrl(v);
      if (!v.trim()) setUrlError(null);
      else setUrlError(isValidHttpUrl(v) ? null : "유효한 URL이 아닙니다.");
      if (error) setError(null);
    },
    [error]
  );

  const onTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      setText(v.length > maxLen ? v.slice(0, maxLen) : v);
      if (error) setError(null);
    },
    [error]
  );

  const onTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(sanitizeTitle(e.target.value) ?? "");
      if (error) setError(null);
    },
    [error]
  );

  const onSiteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSite(sanitizeSite(e.target.value) ?? "");
      if (error) setError(null);
    },
    [error]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSubmit) return;

      setIsSubmitting(true);
      setError(null);
      setSummary(null);

      try {
        const payload: SummarizeRequest = urlMode
          ? { mode: "url", url: url.trim() }
          : {
              mode: "fallback",
              url: url.trim(),
              text: text.trim(),
              title: title.trim() || undefined,
              site: site.trim() || undefined,
            };

        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (data?.fallback) {
          setFallbackMode(true);
          return;
        }

        if (!res.ok) {
          const code = data?.error_code;
          switch (code) {
            case "validation_failed":
              setError(data?.message || "입력값을 확인해 주세요.");
              break;
            case "summarize_failed":
              setError("요약 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
              break;
            case "persist_failed":
              setError("요약 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
              break;
            case "unauthorized":
              setError("로그인이 필요합니다.");
              break;
            default:
              setError(
                "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
              );
          }
          return;
        }

        refreshSummaryUsage();
        setSummary(data.summary);
      } catch (err: any) {
        setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, urlMode, url, text, title, site]
  );

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">뉴스 요약</h1>

      {/* 한도 정보 안내 */}
      <div className="mb-3 text-sm">
        {usageError
          ? usageError
          : remaining !== null && limit !== null
          ? `오늘 남은 요약 가능 횟수: ${remaining} / ${limit}`
          : "잔여 요약 한도 계산중…"}
      </div>

      <form onSubmit={onSubmit} className="space-y-4" aria-describedby="helper">
        {/* URL 입력 */}
        <div className="space-y-2">
          <label htmlFor="url" className="block text-sm font-medium">
            URL
          </label>
          <input
            id="url"
            type="url"
            inputMode="url"
            value={url}
            onChange={onUrlChange}
            placeholder="https://example.com/news/..."
            className="w-full rounded border p-3 outline-none focus:ring"
            aria-invalid={!!urlError}
            readOnly={fallbackMode} // 폴백 모드에서 URL 고정
          />
          {urlError && (
            <p className="text-xs text-red-600" role="alert">
              {urlError}
            </p>
          )}
        </div>

        {/* 텍스트 폴백 폼*/}
        {fallbackMode && (
          <div className="space-y-2">
            <div
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              role="status"
              aria-live="polite"
            >
              이 도메인은 자동 추출이 어려워요. 기사 본문을 붙여 넣어 주세요.
            </div>
            <label htmlFor="input" className="block text-sm font-medium">
              본문
            </label>
            <textarea
              id="input"
              value={text}
              onChange={onTextChange}
              rows={10}
              placeholder="기사 본문을 붙여 넣어 주세요."
              className="w-full rounded border p-3 outline-none focus:ring"
              aria-describedby="helper counter"
            />
            <div
              id="counter"
              className="text-xs text-gray-600 dark:text-gray-300"
            >
              {tlen} / {maxLen} (최소 {minLen}자 이상)
            </div>
            {/* 선택 메타 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="title" className="block text-sm">
                  제목(선택)
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={onTitleChange}
                  className="w-full rounded border p-2 outline-none focus:ring mt-2"
                  placeholder="기사 제목이 있는 경우"
                />
              </div>
              <div>
                <label htmlFor="site" className="block text-sm">
                  매체(선택)
                </label>
                <input
                  id="site"
                  value={site}
                  onChange={onSiteChange}
                  className="w-full rounded border p-2 outline-none focus:ring mt-2"
                  placeholder="매체명 또는 출처"
                />
              </div>
            </div>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {/* 버튼 */}
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            disabled={!canSubmit}
            aria-busy={isSubmitting}
          >
            {isSubmitting
              ? "요약 중…"
              : fallbackMode
              ? "텍스트로 요약"
              : "요약"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setUrl("");
              setText("");
              setTitle("");
              setSite("");
              setUrlError(null);
              setError(null);
              setFallbackMode(false);
              setSummary(null);
            }}
            disabled={isSubmitting || (!tlen && !url)}
          >
            초기화
          </Button>
        </div>
      </form>

      {/* 요약 결과 */}
      {summary && (
        <section className="mt-6">
          <h2 className="text-lg font-medium mb-2">요약 결과</h2>
          <article className="card">
            <p className="whitespace-pre-wrap">{summary}</p>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded px-3 py-1 text-sm font-medium transition-colors bg-gray-800 text-white hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                onClick={() => navigator.clipboard?.writeText(summary)}
              >
                복사
              </button>
            </div>
          </article>
        </section>
      )}
    </>
  );
}
