export type Provider = "google" | "kakao";

export type NormalizedProfile = {
  displayName: string | null;
  avatarUrl: string | null;
  providerUserId: string;
  providerEmail: string | null;
};

export function normalizeProfile(
  provider: Provider,
  meta: Record<string, unknown>
): NormalizedProfile | null {
  // 공통: OIDC 표준 sub 우선, 없으면 일부 공급자는 id를 제공
  const sub =
    (meta.sub as string | undefined) ?? (meta.id as string | undefined);
  if (!sub) return null;

  if (provider === "google") {
    const displayName = (meta.name as string | undefined) ?? null;
    const avatarUrl = (meta.picture as string | undefined) ?? null;
    const providerEmail = (meta.email as string | undefined) ?? null;

    return {
      displayName,
      avatarUrl,
      providerUserId: sub,
      providerEmail,
    };
  }

  if (provider === "kakao") {
    const displayName = (meta.profile_nickname as string | undefined) ?? null;
    const avatarUrl = (meta.profile_image as string | undefined) ?? null;
    const providerEmail = null;

    return {
      displayName,
      avatarUrl,
      providerUserId: sub,
      providerEmail,
    };
  }

  return null;
}
