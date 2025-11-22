-- 1. RLS 활성화
ALTER TABLE public.summary_usage_daily ENABLE ROW LEVEL SECURITY;

-- 2. 본인만 조회 (select)
CREATE POLICY "read_own_daily_usage"
  ON public.summary_usage_daily
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. 본인만 생성 (insert)
CREATE POLICY "write_own_daily_usage"
  ON public.summary_usage_daily
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. 본인만 수정 (update)
CREATE POLICY "update_own_daily_usage"
  ON public.summary_usage_daily
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());