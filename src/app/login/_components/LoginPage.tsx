"use client";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createSbBrowser } from "@/lib/supabase/browser";

type Provider = "google" | "kakao";

const OAUTH_OPTIONS: Record<
  Provider,
  { options: { queryParams?: Record<string, string> } }
> = {
  google: { options: { queryParams: { prompt: "select_account" } } },
  kakao: {
    options: {
      queryParams: { scope: "openid profile_nickname profile_image" },
    },
  },
};

export default function LoginPage() {
  const sb = createSbBrowser();
  const params = useSearchParams();
  const state = params.get("state") ?? "/";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const start = (provider: Provider) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const origin = window.location.origin;
        const { options } = OAUTH_OPTIONS[provider];
        await sb.auth.signInWithOAuth({
          provider,
          options: {
            ...options,
            redirectTo: `${origin}/auth/callback?state=${encodeURIComponent(
              state
            )}`,
          },
        });
      } catch (e) {
        const err = e instanceof Error ? e : new Error("로그인 실패");
        setError(err.message);
      }
    });
  };

  return (
    <div className="mx-auto max-w-sm py-12 space-y-4">
      <h1 className="text-xl">로그인</h1>
      <button
        className="w-full py-3"
        onClick={() => start("google")}
        disabled={pending}
      >
        Google로 로그인
      </button>
      <button
        className="w-full py-3"
        onClick={() => start("kakao")}
        disabled={pending}
      >
        Kakao로 로그인
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
