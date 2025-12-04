-- AlterTable
ALTER TABLE "summaries" ALTER COLUMN "last_requested_at" SET DEFAULT (now() at time zone 'Asia/Seoul'),
ALTER COLUMN "created_at" SET DEFAULT (now() at time zone 'Asia/Seoul'),
ALTER COLUMN "updated_at" SET DEFAULT (now() at time zone 'Asia/Seoul');

-- AlterTable
ALTER TABLE "summary_usage_daily" ALTER COLUMN "last_used_at" SET DEFAULT (now() at time zone 'Asia/Seoul');

-- AlterTable
ALTER TABLE "user_providers" ALTER COLUMN "linked_at" SET DEFAULT (now() at time zone 'Asia/Seoul');

-- AlterTable
ALTER TABLE "user_summaries" ALTER COLUMN "last_requested_at" SET DEFAULT (now() at time zone 'Asia/Seoul'),
ALTER COLUMN "created_at" SET DEFAULT (now() at time zone 'Asia/Seoul'),
ALTER COLUMN "updated_at" SET DEFAULT (now() at time zone 'Asia/Seoul');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT (now() at time zone 'Asia/Seoul'),
ALTER COLUMN "updated_at" SET DEFAULT (now() at time zone 'Asia/Seoul');
