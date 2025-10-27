"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { createSbBrowser } from "@/lib/supabase/browser";
import { UserBasic } from "@/types/user";

export default function AvatarMenu() {
  const router = useRouter();
  const supabase = createSbBrowser();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserBasic | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUser(null);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("nickname, avatar_url")
        .single();
      if (!mounted) return;
      if (!error && data) {
        setUser({ nickname: data.nickname, avatar_url: data.avatar_url });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current || !btnRef.current) return;
      if (
        !menuRef.current.contains(e.target as Node) &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

  const initials = user?.nickname?.trim()?.slice(0, 2) || "U";

  const logout = async () => {
    setOpen(false);
    setUser(null);
    await supabase.auth.signOut();
    router.refresh();
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar
          src={user.avatar_url}
          alt={`${user.nickname} 프로필`}
          initials={initials}
          size="sm"
        />
      </button>

      {open && (
        <div
          id="user-menu"
          role="menu"
          ref={menuRef}
          className="
            absolute right-0 mt-2 w-48 rounded-md
            border border-[var(--border)]
            bg-[var(--panel)]
            text-[var(--card-fg)]
            shadow-md overflow-hidden
          "
        >
          <div className="px-3 py-2 text-sm select-none" aria-hidden>
            {user.nickname}
          </div>
          <div className="h-px bg-[var(--border)]" />

          {/* 내 브리핑 이동 */}
          <a
            href="/briefings"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--hover-bg)]"
            onClick={() => setOpen(false)}
          >
            내 브리핑
          </a>

          <div className="h-px bg-[var(--border)]" />

          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--hover-bg)]"
            aria-label="로그아웃"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
