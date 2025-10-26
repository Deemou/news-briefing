import { NextResponse } from "next/server";
import { createSbServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const sb = createSbServer({ req });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("summaries")
    .select(
      `
      id,
      source_url,
      site,
      title,
      summary_text,
      created_at,
      user_summaries!inner(pinned)
    `
    )
    .eq("user_summaries.user_id", user.id)
    .order("pinned", { referencedTable: "user_summaries", ascending: false })
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const briefings = (data || []).map((row: any) => ({
    id: row.id,
    source_url: row.source_url,
    site: row.site,
    title: row.title,
    summary_text: row.summary_text,
    created_at: row.created_at,
    pinned: row.user_summaries?.[0]?.pinned ?? false,
  }));

  return NextResponse.json({ briefings });
}
