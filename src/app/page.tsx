"use client";

import { useState, useCallback } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minLen = 50;
  const maxLen = 4000;

  const length = text.trim().length;
  const isTooShort = length > 0 && length < minLen;
  const isTooLong = length > maxLen;

  const canSubmit = length >= minLen && length <= maxLen && !isSubmitting;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
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

      try {
        console.log("submit text length=", length);
      } catch (err: any) {
        setError(err?.message ?? "요청에 실패했어요.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, length]
  );

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">뉴스 요약</h1>

      <form onSubmit={onSubmit} className="space-y-3" aria-describedby="helper">
        <label htmlFor="input" className="block text-sm font-medium">
          본문 붙여넣기
        </label>

        <textarea
          id="input"
          value={text}
          onChange={onChange}
          rows={10}
          placeholder="요약할 텍스트를 붙여넣으세요."
          className="w-full rounded border p-3 outline-none focus:ring"
          aria-invalid={isTooShort || isTooLong}
          aria-describedby="helper counter"
        />

        <div id="counter" className="text-xs text-gray-500">
          {length} / {maxLen}
        </div>

        <div id="helper" className="text-xs">
          최소 {minLen}자 이상 입력하면 요약할 수 있어요.
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
            onClick={() => setText("")}
            className="rounded border px-4 py-2"
            disabled={isSubmitting || length === 0}
          >
            지우기
          </button>
        </div>
      </form>
    </main>
  );
}
