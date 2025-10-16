import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

export async function requireAnonymous(state = "/") {
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

  const { data } = await sb.auth.getUser();

  if (data.user) {
    redirect(state ?? "/");
  }

  return;
}
