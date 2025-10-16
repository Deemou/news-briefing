import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

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
    const path = returnTo;
    const loginUrl = new URL("/login", process.env.SITE_URL);
    loginUrl.searchParams.set("state", path);
    redirect(loginUrl.pathname + "?" + loginUrl.searchParams.toString());
  }

  return;
}
