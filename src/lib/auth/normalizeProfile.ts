import { NormalizedProfile, ProviderUserMeta } from "@/types/auth";

export function normalizeProfile(meta: ProviderUserMeta): NormalizedProfile {
  const sub = (meta.sub || meta.provider_id) as string;

  const nickname =
    meta.preferred_username ||
    meta.user_name ||
    meta.name ||
    meta.full_name ||
    "사용자";
  const avatarUrl = meta.avatar_url || meta.picture || null;

  return {
    nickname,
    avatarUrl,
    providerUserId: sub,
  };
}
