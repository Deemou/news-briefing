-- CreateEnum
CREATE TYPE "SummaryMode" AS ENUM ('url', 'fallback');

-- AlterTable
ALTER TABLE "summaries" ADD COLUMN     "mode" "SummaryMode" NOT NULL DEFAULT 'url',
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
