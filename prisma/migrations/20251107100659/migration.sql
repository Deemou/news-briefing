/*
  Warnings:

  - You are about to drop the column `is_private` on the `summaries` table. All the data in the column will be lost.
  - You are about to drop the column `source_url` on the `user_summaries` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."user_summaries_user_url_uniq";

-- AlterTable
ALTER TABLE "summaries" DROP COLUMN "is_private",
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_providers" ALTER COLUMN "linked_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_summaries" DROP COLUMN "source_url",
ADD COLUMN     "fallback_site" TEXT,
ADD COLUMN     "fallback_title" TEXT,
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();
