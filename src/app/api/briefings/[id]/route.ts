import { NextResponse } from "next/server";
import { createSbUser, createSbAdmin } from "@/lib/supabase/server";
import { deleteLinkAndGc } from "@/lib/supabase/rpc";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params; // user_summaries.id

  const sbUser = createSbUser({ req });
  const {
    data: { user },
    error: uErr,
  } = await sbUser.auth.getUser();
  if (uErr) {
    console.error("[briefings/:id] getUser failed", { message: uErr.message });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user) {
    console.warn("[briefings/:id] no user session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSbAdmin();

  const { data: link, error: linkErr } = await admin
    .from("user_summaries")
    .select(
      "id, user_id, summary_id, fallback_title, fallback_site, pinned, last_requested_at"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (linkErr) {
    console.error("[briefings/:id] user_summaries read failed", {
      id,
      userId: user.id,
      detail: linkErr.message,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  if (!link) {
    console.warn("[briefings/:id] link not found", { id, userId: user.id });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: sum, error: sumErr } = await admin
    .from("summaries")
    .select("id, source_url, site, title, summary_text, created_at")
    .eq("id", link.summary_id)
    .maybeSingle();

  if (sumErr) {
    console.error("[briefings/:id] summaries read failed", {
      summaryId: link.summary_id,
      detail: sumErr.message,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  if (!sum) {
    console.warn("[briefings/:id] summary not found", {
      summaryId: link.summary_id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    briefing: {
      id: link.id,
      summary_id: sum.id,
      source_url: sum.source_url,
      site: link.fallback_site ?? sum.site,
      title: link.fallback_title ?? sum.title,
      summary_text: sum.summary_text,
      created_at: sum.created_at,
      pinned: link.pinned ?? false,
    },
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params; // user_summaries.id

  // 1) 세션 확인
  const sbUser = createSbUser({ req });
  const {
    data: { user },
    error: uErr,
  } = await sbUser.auth.getUser();
  if (uErr) {
    console.error("[briefings/:id][DELETE] getUser failed", {
      message: uErr.message,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user) {
    console.warn("[briefings/:id][DELETE] no user session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) 본인 링크 읽어 summary_id 확보
  const admin = createSbAdmin();
  const { data: link, error: readErr } = await admin
    .from("user_summaries")
    .select("id, summary_id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (readErr || !link) {
    if (readErr) {
      console.error("[briefings/:id][DELETE] read failed", {
        id,
        userId: user.id,
        detail: readErr.message,
      });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 3) RPC: 링크 삭제 + orphan GC(동일 트랜잭션)
  await deleteLinkAndGc(admin, link.id, link.summary_id);

  return NextResponse.json({ ok: true }, { status: 200 });
}
