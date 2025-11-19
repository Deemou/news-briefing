import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminClient = SupabaseClient;

export type UserSummaryRow = {
  id: string;
  user_id: string;
  summary_id: string;
  source_url: string | null;
  fallback_title: string | null;
  fallback_site: string | null;
  pinned?: boolean | null;
  last_requested_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function deleteSummaryIfOrphan(
  sbAdmin: AdminClient,
  summaryId: string
) {
  const { data, error } = await sbAdmin.rpc("delete_summary_if_orphan", {
    p_summary_id: summaryId,
  });
  if (error) throw error;
  return data as boolean;
}

export async function performFallbackUpdate(
  sbAdmin: AdminClient,
  args: {
    userId: string;
    sourceUrl: string;
    targetSummaryId: string;
    oldSummaryId?: string | null;
    fallbackTitle: string | null;
    fallbackSite: string | null;
  }
) {
  const { data, error } = await sbAdmin.rpc("perform_fallback_update", {
    p_user_id: args.userId,
    p_source_url: args.sourceUrl,
    p_target_summary_id: args.targetSummaryId,
    p_old_summary_id: args.oldSummaryId ?? null,
    p_fallback_title: args.fallbackTitle,
    p_fallback_site: args.fallbackSite,
  });
  if (error) throw error;
  return data;
}

export async function deleteLinkAndGc(
  sbAdmin: AdminClient,
  linkId: string,
  summaryId: string
) {
  const { error } = await sbAdmin.rpc("delete_link_and_gc", {
    p_link_id: linkId,
    p_summary_id: summaryId,
  });
  if (error) throw error;
}
