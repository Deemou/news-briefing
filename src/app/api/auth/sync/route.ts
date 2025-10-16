import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { normalizeProfile, type Provider } from "@/lib/auth/normalizeProfile";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY_ = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });

  const sb = createServerClient(URL_, KEY_, {
    cookies: {
      getAll: () => {
        const raw = req.headers.get("cookie") ?? "";
        if (!raw) return [];
        return raw.split(";").map((pair) => {
          const [k, ...rest] = pair.trim().split("=");
          return { name: k, value: decodeURIComponent(rest.join("=")) };
        });
      },
      setAll: (cookies) => {
        for (const c of cookies) res.cookies.set(c.name, c.value, c.options);
      },
    },
  });

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const u = userData.user;
  const provider = (u.app_metadata?.provider as Provider | undefined) ?? null;
  if (!provider) {
    return NextResponse.json({ error: "provider_missing" }, { status: 400 });
  }

  const norm = normalizeProfile(provider, u.user_metadata ?? {});
  if (!norm) {
    return NextResponse.json(
      { error: "provider_user_id_missing" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // users upsert
  {
    const { error } = await sb.from("users").upsert(
      {
        id: u.id,
        email: u.email,
        nickname: norm.displayName ?? "사용자",
        avatar_url: norm.avatarUrl,
        last_login_at: now,
        is_active: true,
      },
      { onConflict: "id" }
    );
    if (error) {
      return NextResponse.json(
        { error: "users_upsert_failed", detail: error.message },
        { status: 500 }
      );
    }
  }

  // user_providers upsert
  {
    const { error } = await sb.from("user_providers").upsert(
      {
        user_id: u.id,
        provider,
        provider_user_id: norm.providerUserId,
        provider_email: norm.providerEmail,
        profile_json: u.user_metadata ?? null,
        linked_at: now,
      },
      { onConflict: "provider,provider_user_id" }
    );
    if (error) {
      return NextResponse.json(
        { error: "user_providers_upsert_failed", detail: error.message },
        { status: 500 }
      );
    }
  }

  console.log(res);

  return res;
}
