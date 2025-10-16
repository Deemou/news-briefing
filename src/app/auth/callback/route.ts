import { NextResponse } from "next/server";
import { createSbServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "/";

  const res = NextResponse.redirect(new URL(state, url.origin));

  const sb = createSbServer({
    req,
    setAll: (cookies) => {
      for (const c of cookies) res.cookies.set(c.name, c.value, c.options);
    },
  });

  if (code) {
    await sb.auth.exchangeCodeForSession(code); // 세션 확립(쿠키 쓰기 필요)
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const syncRes = await fetch(`${url.origin}/api/auth/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!syncRes.ok) {
        console.error("[auth/callback] sync failed", {
          status: syncRes.status,
          statusText: syncRes.statusText,
          state,
          at: new Date().toISOString(),
        });
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error("unknown error");
      console.error("[auth/callback] sync error", {
        message: err.message,
        name: err.name,
        state,
        at: new Date().toISOString(),
      });
    }
  }

  return res;
}
