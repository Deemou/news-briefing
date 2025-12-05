import { NextResponse } from "next/server";
import { createSbUser } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { params } = ctx;
  const { id } = await params;

  const sbUser = createSbUser({ req });
  const {
    data: { user },
  } = await sbUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) 해당 링크가 이 유저의 소유인지 + pinned 상태 조회
  const { data: row, error: readErr } = await sbUser
    .from("user_summaries")
    .select("pinned")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (readErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextPinned = !row.pinned;

  const { error: updErr } = await sbUser
    .from("user_summaries")
    .update({ pinned: nextPinned })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ pinned: nextPinned });
}
