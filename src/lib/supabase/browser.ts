import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const pk = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function createSbBrowser() {
  return createBrowserClient(url, pk);
}
