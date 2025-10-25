export type UserInsert = {
  id: string;
  email: string | null;
  nickname: string;
  avatar_url: string | null;
  last_login_at: string;
  is_active: boolean;
};

export type SummaryInsert = {
  created_by: string;
  source_url: string | null;
  site: string | null;
  title: string | null;
  article_published_at: string | null;
  article_text: string;
  summary_text: string;
  generator_version: string;
};

export type SummaryRow = SummaryInsert & {
  id: string;
  created_at: string;
  updated_at: string;
};

export type UserSummaryInsert = {
  user_id: string;
  summary_id: string;
  pinned?: boolean;
};

export type UserSummaryRow = UserSummaryInsert & {
  id: string;
  created_at: string;
  updated_at: string;
};
