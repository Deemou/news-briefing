import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

export async function requireUser(returnTo?: string) {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    const path = returnTo || "/";
    const loginUrl = new URL("/login", process.env.SITE_URL);
    loginUrl.searchParams.set("state", path);
    redirect(loginUrl.pathname + "?" + loginUrl.searchParams.toString());
  }
  return { user, sb };
}
