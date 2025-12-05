"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as React from "react";
import type { Briefing } from "@/types/briefing";
import { formatDateTimeKST } from "@/lib/utils/formatDate";

export default function BriefingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pinPending, setPinPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/briefings/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error);
        setBriefing(data.briefing);
      } catch (e: any) {
        setErr(e?.message ?? "브리핑을 불러오지 못했습니다.");
      }
    })();
  }, [id]);

  const onPin = async () => {
    if (!briefing || pinPending) return;

    try {
      setPinPending(true);
      const res = await fetch(`/api/briefings/${briefing.id}/pin`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "핀 상태 변경 실패");

      setBriefing((prev) => (prev ? { ...prev, pinned: data.pinned } : prev));
    } catch (e: any) {
      alert(e?.message ?? "핀 상태 변경 중 오류가 발생했습니다.");
    } finally {
      setPinPending(false);
    }
  };

  const onDelete = async () => {
    if (!briefing || deletePending) return;
    if (!confirm("정말 이 브리핑을 삭제하시겠습니까?")) return;

    try {
      setDeletePending(true);
      const res = await fetch(`/api/briefings/${briefing.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("삭제 실패");

      window.location.href = "/briefings";
    } catch (e: any) {
      alert(e?.message ?? "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletePending(false);
    }
  };

  if (err) return <div className="text-red-600">{err}</div>;
  if (!briefing) return <div className="text-center">불러오는 중…</div>;

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
      </div>

      <article className="card">
        <header className="mb-4 flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold mb-2">{title}</h1>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {briefing.site && <span>{briefing.site}</span>}
              <span className="mx-2">·</span>
              <time>{formatDateTimeKST(briefing.created_at)}</time>
            </div>
            {briefing.source_url && (
              <a
                href={briefing.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline mt-2 inline-block text-sm"
              >
                원문 보기
              </a>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPin}
              disabled={pinPending}
              className="btn-ghost text-xs px-2 py-1"
            >
              {briefing.pinned ? "핀 해제" : "핀 고정"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deletePending}
              className="btn-ghost text-xs px-2 py-1 text-red-600"
            >
              삭제
            </button>
          </div>
        </header>

        <section className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
          {briefing.summary_text}
        </section>
      </article>
    </>
  );
}
