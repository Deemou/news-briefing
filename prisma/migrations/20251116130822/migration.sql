/*
  Warnings:

  - A unique constraint covering the columns `[source_url,content_hash]` on the table `summaries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,source_url]` on the table `user_summaries` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `source_url` to the `user_summaries` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."summaries_content_hash_idx";

-- DropIndex
DROP INDEX "public"."user_summaries_user_id_summary_id_key";

-- AlterTable
ALTER TABLE "summaries" ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_providers" ALTER COLUMN "linked_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_summaries" ADD COLUMN     "source_url" TEXT NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- CreateIndex
CREATE UNIQUE INDEX "summaries_url_hash_key" ON "summaries"("source_url", "content_hash");

-- CreateIndex
CREATE INDEX "user_summaries_summary_id_idx" ON "user_summaries"("summary_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_summaries_user_id_source_url_key" ON "user_summaries"("user_id", "source_url");
