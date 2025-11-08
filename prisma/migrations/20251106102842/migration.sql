/*
  Warnings:

  - Made the column `source_url` on table `summaries` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."summaries_source_url_unique";

-- AlterTable
ALTER TABLE "summaries" ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "source_url" SET NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_providers" ALTER COLUMN "linked_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_summaries" ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- 01) 전역 정본만 URL 유니크(부분 유니크 인덱스)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'uniq_summaries_source_url_public'
      AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX uniq_summaries_source_url_public
      ON public.summaries(source_url)
      WHERE is_private = false;
  END IF;
END $$;

-- 02) URL + is_private 조회 최적화(정본/개인본 분기)
CREATE INDEX IF NOT EXISTS idx_summaries_url_private
  ON public.summaries(source_url, is_private);

-- 03) content_hash 인덱스 보강(이미 있으면 skip)
CREATE INDEX IF NOT EXISTS summaries_content_hash_idx
  ON public.summaries(content_hash);
