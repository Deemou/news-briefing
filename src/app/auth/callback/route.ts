import { NextResponse } from "next/server";
import { createSbServer } from "@/lib/supabase/server";
import { normalizeProfile, type Provider } from "@/lib/auth/normalizeProfile";

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
    try {
      await sb.auth.exchangeCodeForSession(code);

      const { data: userData, error: userErr } = await sb.auth.getUser();
      if (userErr || !userData?.user) {
        console.error("[auth/callback] getUser failed", { error: userErr });
        return res;
      }

      console.log(userData);

      const u = userData.user;
      const provider =
        (u.app_metadata?.provider as Provider | undefined) ?? null;

      console.log(u);
      console.log(provider);

      const norm = provider
        ? normalizeProfile(provider, u.user_metadata ?? {})
        : null;

      console.log(norm);

      const now = new Date().toISOString();

      const { data: existingUser, error: readErr } = await sb
        .from("users")
        .select("id")
        .eq("id", u.id)
        .maybeSingle();

      if (readErr) {
        console.error("[auth/callback] users read failed", {
          detail: readErr.message,
        });
        return res;
      }

      if (!existingUser) {
        const insertPayload: any = {
          id: u.id,
          email: u.email ?? null,
          nickname: norm?.displayName ?? "사용자",
          avatar_url: norm?.avatarUrl ?? null,
          last_login_at: now,
          is_active: true,
        };
        const { error: insertErr } = await sb
          .from("users")
          .insert(insertPayload);
        if (insertErr) {
          console.error("[auth/callback] users insert failed", {
            detail: insertErr.message,
          });
          return res;
        }
      } else {
        const { error: updateErr } = await sb
          .from("users")
          .update({ last_login_at: now, is_active: true })
          .eq("id", u.id);
        if (updateErr) {
          console.error("[auth/callback] users update failed", {
            detail: updateErr.message,
          });
          return res;
        }
      }

      if (provider && norm) {
        const { error: upErr } = await sb.from("user_providers").upsert(
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
        if (upErr) {
          console.error("[auth/callback] user_providers upsert failed", {
            detail: upErr.message,
          });
          return res;
        }
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error("unknown error");
      console.error("[auth/callback] sync error", {
        message: err.message,
        name: err.name,
      });
    }
  }

  return res;
}
