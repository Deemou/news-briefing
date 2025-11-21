/*
  Warnings:

  - Made the column `last_requested_at` on table `summaries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `last_requested_at` on table `user_summaries` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "summaries" ALTER COLUMN "last_requested_at" SET NOT NULL,
ALTER COLUMN "last_requested_at" SET DEFAULT now(),
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_providers" ALTER COLUMN "linked_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "user_summaries" ALTER COLUMN "last_requested_at" SET NOT NULL,
ALTER COLUMN "last_requested_at" SET DEFAULT now(),
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now();
