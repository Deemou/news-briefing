-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nickname" TEXT NOT NULL,
    "email" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "locale" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "profile_json" JSONB,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "user_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_url" TEXT,
    "site" TEXT,
    "title" TEXT,
    "article_published_at" TIMESTAMP(3),
    "content_hash" TEXT NOT NULL,
    "summary_text" TEXT NOT NULL,
    "generator_version" TEXT NOT NULL DEFAULT 'v1',
    "total_requests" BIGINT NOT NULL DEFAULT 0,
    "last_requested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "summary_id" UUID NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "last_requested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "user_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_unique_not_null" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_providers_user_id_idx" ON "user_providers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_providers_unique_provider_uid" ON "user_providers"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "summaries_content_hash_idx" ON "summaries"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "summaries_source_url_unique" ON "summaries"("source_url");

-- CreateIndex
CREATE INDEX "user_summaries_user_created_idx" ON "user_summaries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_summaries_user_last_req_idx" ON "user_summaries"("user_id", "last_requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_summaries_user_id_summary_id_key" ON "user_summaries"("user_id", "summary_id");

-- AddForeignKey
ALTER TABLE "user_providers" ADD CONSTRAINT "user_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_summaries" ADD CONSTRAINT "user_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_summaries" ADD CONSTRAINT "user_summaries_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
