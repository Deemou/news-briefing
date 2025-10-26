"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Briefing } from "@/types/briefing";
import * as React from "react";

export default function BriefingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/briefings/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "불러오기 실패");
        setBriefing(data.briefing);
      } catch (e: any) {
        setErr(e?.message ?? "오류가 발생했습니다.");
      }
    })();
  }, [id]);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!briefing) return <div className="text-gray-500">로딩 중…</div>;

  const title =
    briefing.title || briefing.summary_text.split("\n")[0].slice(0, 80) + "...";

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/briefings"
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          aria-label="내 브리핑 목록"
        >
          내 브리핑 목록
        </Link>
        <span aria-hidden className="sr-only" />
      </div>

      <article className="card">
        <header className="mb-3">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            <span>{briefing.site || "출처 불명"}</span>
            <span className="mx-2">•</span>
            <time>{new Date(briefing.created_at).toLocaleString()}</time>
          </div>
          {briefing.source_url && (
            <a
              href={briefing.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              원문 보기
            </a>
          )}
        </header>

        <section className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
          {briefing.summary_text}
        </section>
      </article>
    </>
  );
}
