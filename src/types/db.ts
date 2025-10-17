export type UserInsert = {
  id: string;
  email: string | null;
  nickname: string;
  avatar_url: string | null;
  last_login_at: string;
  is_active: boolean;
};
