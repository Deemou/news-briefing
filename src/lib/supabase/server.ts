import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieOptionsWithName } from "@supabase/ssr";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

function parseAllCookies(req?: Request) {
  if (!req) return [];
  const raw = req.headers.get("cookie") ?? "";
  if (!raw) return [];
  return raw.split(";").map((pair) => {
    const [k, ...rest] = pair.trim().split("=");
    return { name: k, value: decodeURIComponent(rest.join("=")) };
  });
}

// SSR: 공개 키로 세션/쿠키 처리
export function createSbUser(opts: {
  req: Request;
  setAll?: (
    cookies: {
      name: string;
      value: string;
      options?: Partial<CookieOptionsWithName>;
    }[]
  ) => void;
}): SupabaseClient {
  const { req, setAll } = opts;
  return createServerClient(URL_, PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => parseAllCookies(req),
      ...(setAll ? { setAll } : {}),
    },
  });
}

// Server Admin: 비밀 키 + Authorization 강제
export function createSbAdmin(): SupabaseClient {
  return createClient(URL_, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: SECRET_KEY,
        Authorization: `Bearer ${SECRET_KEY}`,
      },
    },
  });
}
