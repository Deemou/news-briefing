"use client";

import { useState, useCallback } from "react";
import { isValidHttpUrl } from "@/lib/validators/url";

const minLen = 50;
const maxLen = 4000;

export default function Home() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tlen = text.trim().length;
  const urlMode = !!url.trim();
  const urlValid = !urlMode || isValidHttpUrl(url);
  const isTooShort = !urlMode && tlen > 0 && tlen < minLen;
  const isTooLong = !urlMode && tlen > maxLen;

  const canSubmit =
    (urlMode ? urlValid : tlen >= minLen && tlen <= maxLen) && !isSubmitting;

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

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSubmit) return;

      setIsSubmitting(true);
      setError(null);
      setSummary(null);

      try {
        const payload: { url?: string; text?: string } = urlMode
          ? { url: url.trim() }
          : { text: text.trim() };

        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "요청에 실패했어요.");
          return;
        }
        setSummary(data.summary);
      } catch (err: any) {
        setError(err?.message ?? "요청에 실패했어요.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, urlMode, url, text]
  );

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">뉴스 요약</h1>

      <form onSubmit={onSubmit} className="space-y-4" aria-describedby="helper">
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
          />
          {urlError && (
            <p className="text-xs text-red-600" role="alert">
              {urlError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="input" className="block text-sm font-medium">
            본문
          </label>
          <textarea
            id="input"
            value={text}
            onChange={onTextChange}
            rows={10}
            placeholder="URL을 사용할 수 없는 경우, 텍스트를 붙여 넣으세요."
            className="w-full rounded border p-3 outline-none focus:ring"
            aria-invalid={isTooShort || isTooLong}
            aria-describedby="helper counter"
            disabled={urlMode}
          />
          <div id="counter" className="text-xs text-gray-500">
            {tlen} / {maxLen} (최소 {minLen}자 이상)
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            disabled={!canSubmit}
          >
            {isSubmitting ? "요약 중…" : "요약"}
          </button>
          <button
            type="button"
            onClick={() => {
              setUrl("");
              setText("");
              setSummary(null);
              setUrlError(null);
            }}
            className="rounded border px-4 py-2"
            disabled={isSubmitting || (!tlen && !url)}
          >
            지우기
          </button>
        </div>
      </form>

      {summary && (
        <section className="mt-6">
          <h2 className="text-lg font-medium mb-2">요약 결과</h2>
          <article className="rounded border p-4 shadow-sm bg-white">
            <p className="whitespace-pre-wrap">{summary}</p>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded bg-gray-800 px-3 py-1 text-sm text-white"
                onClick={() => navigator.clipboard?.writeText(summary)}
              >
                복사
              </button>
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={() => {
                  setText(summary);
                  setSummary(null);
                }}
              >
                텍스트로 가져오기
              </button>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
