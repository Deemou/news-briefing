import { Briefing } from "@/types/briefing";
import { formatRelativeTime } from "@/lib/utils/formatDate";

interface BriefingCardProps {
  briefing: Briefing;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}

export function BriefingCard({
  briefing,
  onPin,
  onDelete,
  onClick,
}: BriefingCardProps) {
  const title =
    briefing.title || briefing.summary_text.split("\n")[0].slice(0, 50) + "...";
  const source = briefing.site || "출처 불명";
  const icon = briefing.source_url ? "📰" : "📝";

  return (
    <article
      className="card cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(briefing.id)}
    >
      {/* 헤더 */}
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold line-clamp-2 flex items-start gap-2">
            <span>{icon}</span>
            <span>{title}</span>
          </h3>
        </div>
        {briefing.pinned && (
          <span className="text-yellow-500 flex-shrink-0">📌</span>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
        <span className={briefing.source_url ? "" : "italic"}>{source}</span>
        <span>•</span>
        <time>{formatRelativeTime(briefing.created_at)}</time>
      </div>

      {/* 요약 미리보기 */}
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-3">
        {briefing.summary_text}
      </p>

      {/* 액션 버튼 */}
      <div className="flex gap-2 justify-end">
        <button
          className="btn-ghost text-xs px-2 py-1"
          onClick={(e) => {
            e.stopPropagation();
            onPin(briefing.id);
          }}
        >
          {briefing.pinned ? "핀 해제" : "핀 고정"}
        </button>
        <button
          className="btn-ghost text-xs px-2 py-1 text-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(briefing.id);
          }}
        >
          삭제
        </button>
      </div>
    </article>
  );
}
