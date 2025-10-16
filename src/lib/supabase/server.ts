import { createServerClient } from "@supabase/ssr";
import type {
  SupabaseClient,
  SupabaseClientOptions,
} from "@supabase/supabase-js";
import type { CookieOptionsWithName } from "@supabase/ssr";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const KEY_ = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

type CreateOpts = {
  req: Request;
  setAll?: (
    cookies: {
      name: string;
      value: string;
      options?: Partial<CookieOptionsWithName>;
    }[]
  ) => void;
  clientOptions?: SupabaseClientOptions<"public">;
};

function parseAllCookies(req: Request): { name: string; value: string }[] {
  const raw = req.headers.get("cookie") ?? "";
  if (!raw) return [];
  return raw.split(";").map((pair) => {
    const [k, ...rest] = pair.trim().split("=");
    return { name: k, value: decodeURIComponent(rest.join("=")) };
  });
}

export function createSbServer(opts: CreateOpts): SupabaseClient {
  const { req, setAll, clientOptions } = opts;

  return createServerClient(URL_, KEY_, {
    ...(clientOptions ?? {}),
    cookies: {
      getAll: () => parseAllCookies(req),
      ...(setAll ? { setAll } : {}),
    },
  });
}
