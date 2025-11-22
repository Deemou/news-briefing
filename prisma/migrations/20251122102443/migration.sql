-- AlterTable
ALTER TABLE "summaries" ALTER COLUMN "last_requested_at" SET DEFAULT now(),
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_providers" ALTER COLUMN "linked_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_summaries" ALTER COLUMN "last_requested_at" SET DEFAULT now(),
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- CreateTable
CREATE TABLE "summary_usage_daily" (
    "user_id" UUID NOT NULL,
    "usage_date" TIMESTAMP(3) NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "summary_usage_daily_pkey" PRIMARY KEY ("user_id","usage_date")
);
