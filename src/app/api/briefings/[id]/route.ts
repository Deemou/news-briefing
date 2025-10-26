import { NextResponse } from "next/server";
import { createSbServer } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { params } = ctx;
  const { id } = await params;

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
    .eq("id", id)
    .eq("user_summaries.user_id", user.id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    briefing: {
      id: data.id,
      source_url: data.source_url,
      site: data.site,
      title: data.title,
      summary_text: data.summary_text,
      created_at: data.created_at,
      pinned: data.user_summaries?.[0]?.pinned ?? false,
    },
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const sb = createSbServer({ req });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await sb
    .from("user_summaries")
    .delete()
    .eq("summary_id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
