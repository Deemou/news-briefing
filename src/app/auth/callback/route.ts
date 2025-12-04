import { NextResponse } from "next/server";
import { createSbUser, createSbAdmin } from "@/lib/supabase/server";
import { normalizeProfile } from "@/lib/auth/normalizeProfile";
import { Provider, ProviderUserMeta } from "@/types/auth";
import { UserInsert } from "@/types/db";
import { getKSTNowISO } from "@/lib/utils/kstDate";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "/";

  // 동일 도메인 경로로 리디렉트 권장(쿠키 SameSite 이슈 방지)
  const res = NextResponse.redirect(new URL(state, url.origin));

  // SSR 세션 클라이언트: 공개키(PUBLISHABLE_KEY)
  const sbUser = createSbUser({
    req,
    setAll: (cookies) => {
      try {
        for (const c of cookies) res.cookies.set(c.name, c.value, c.options);
      } catch (e: any) {
        console.error("[auth/callback] setAll failed", { message: e?.message });
      }
    },
  });

  if (!code) {
    console.warn("[auth/callback] missing code");
    return res;
  }

  // 1) 코드 교환 → 세션 쿠키 설정
  try {
    await sbUser.auth.exchangeCodeForSession(code);
  } catch (e: any) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      message: e?.message,
    });
    return res;
  }

  // 2) 세션 유효성 확인
  const { data: userData, error: userErr } = await sbUser.auth.getUser();
  if (userErr || !userData?.user) {
    console.error("[auth/callback] getUser failed", {
      error: userErr?.message,
    });
    return res;
  }

  const user = userData.user;
  const provider = user.app_metadata.provider as Provider;
  const meta = user.user_metadata as ProviderUserMeta;
  const norm = normalizeProfile(meta);
  const now = getKSTNowISO();

  // 3) DB 동기화는 서버 admin(비밀키)로만 수행
  const sbAdmin = createSbAdmin();

  // 3-1) users 존재 확인
  const { data: existingUser, error: readErr } = await sbAdmin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) {
    console.error("[auth/callback] users read failed", {
      userId: user.id,
      provider,
      detail: readErr.message,
    });
    return res;
  }

  // 3-2) users insert/update
  if (!existingUser) {
    const newUser: UserInsert = {
      id: user.id,
      email: user.email || null,
      nickname: norm.nickname,
      avatar_url: norm.avatarUrl,
      last_login_at: now,
      is_active: true,
    };
    const { error: insertErr } = await sbAdmin.from("users").insert(newUser);
    if (insertErr) {
      console.error("[auth/callback] users insert failed", {
        userId: user.id,
        provider,
        detail: insertErr.message,
      });
      return res;
    }
  } else {
    const { error: updateErr } = await sbAdmin
      .from("users")
      .update({ last_login_at: now, is_active: true })
      .eq("id", user.id);
    if (updateErr) {
      console.error("[auth/callback] users update failed", {
        userId: user.id,
        provider,
        detail: updateErr.message,
      });
      return res;
    }
  }

  // 3-3) user_providers upsert
  const { error: upErr } = await sbAdmin.from("user_providers").upsert(
    {
      user_id: user.id,
      provider,
      provider_user_id: norm.providerUserId,
      profile_json: user.user_metadata,
      linked_at: now,
    },
    { onConflict: "provider,provider_user_id" }
  );
  if (upErr) {
    console.error("[auth/callback] user_providers upsert failed", {
      userId: user.id,
      provider,
      detail: upErr.message,
    });
    return res;
  }

  return res;
}
