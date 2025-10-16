import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function requireUser(returnTo = "/") {
  const res = NextResponse.next();
  const store = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () =>
          store.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (list) =>
          list.forEach((c) => res.cookies.set(c.name, c.value, c.options)),
      },
    }
  );

  const { data, error } = await sb.auth.getUser();

  if (error || !data.user) {
    const origin = process.env.SITE_URL!;
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("state", returnTo || "/");

    const redirectRes = NextResponse.redirect(loginUrl);
    res.cookies
      .getAll()
      .forEach((c) => redirectRes.cookies.set(c.name, c.value));

    return {
      response: redirectRes,
      redirected: true,
      sb: undefined,
      user: null,
    };
  }

  return { response: res, redirected: false, sb, user: data.user };
}
