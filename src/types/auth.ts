export type Provider = "google" | "kakao";
export type ProviderUserMeta = {
  sub?: string;
  provider_id?: string;

  preferred_username?: string;
  user_name?: string;
  name?: string;
  full_name?: string;

  avatar_url?: string;
  picture?: string;
};
export type NormalizedProfile = {
  nickname: string;
  avatarUrl: string | null;
  providerUserId: string;
};
