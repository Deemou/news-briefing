"use client";

import { useEffect, useState } from "react";
import type { Briefing } from "@/types/briefing";
import { BriefingCard } from "./BriefingCard";

export default function BriefingList() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/briefings", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "목록을 불러오지 못했습니다.");
        setBriefings(data.briefings || []);
      } catch (e: any) {
        setErr(e?.message ?? "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onPin = async (id: string) => {
    try {
      const res = await fetch(`/api/briefings/${id}/pin`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "핀 고정에 실패했습니다.");
      setBriefings((prev) =>
        prev
          .map((it) => (it.id === id ? { ...it, pinned: data.pinned } : it))
          .sort(
            (a, b) =>
              Number(b.pinned) - Number(a.pinned) ||
              +new Date(b.created_at) - +new Date(a.created_at)
          )
      );
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/briefings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "삭제에 실패했습니다.");
      setBriefings((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const onClick = (id: string) => {
    window.location.href = `/briefings/${id}`;
  };

  if (loading) return <div className="text-center text-gray-500">로딩 중…</div>;
  if (err) return <div className="text-center text-red-600">{err}</div>;
  if (briefings.length === 0)
    return (
      <div className="text-center text-gray-500">
        저장된 브리핑이 없습니다.{" "}
        <a className="text-blue-600 hover:underline" href="/">
          요약 만들기 →
        </a>
      </div>
    );

  return (
    <div className="space-y-4">
      {briefings.map((briefing) => (
        <BriefingCard
          key={briefing.id}
          briefing={briefing}
          onPin={onPin}
          onDelete={onDelete}
          onClick={onClick}
        />
      ))}
    </div>
  );
}
