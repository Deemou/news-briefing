import { NextResponse } from "next/server";
import { createSbUser } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sb = createSbUser({ req });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows, error: readErr } = await sb
    .from("user_summaries")
    .select("pinned")
    .eq("user_id", user.id)
    .eq("summary_id", params.id)
    .limit(1);

  if (readErr || !rows?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextPinned = !rows[0].pinned;
  const { error: updErr } = await sb
    .from("user_summaries")
    .update({ pinned: nextPinned })
    .eq("user_id", user.id)
    .eq("summary_id", params.id);

  if (updErr)
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ pinned: nextPinned });
}
