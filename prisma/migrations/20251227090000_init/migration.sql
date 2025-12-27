-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogTopicResearch" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "primaryKeyword" TEXT NOT NULL,
    "secondaryKeywords" TEXT NOT NULL,
    "searchIntent" TEXT NOT NULL,
    "contentAngle" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "trendJustification" TEXT NOT NULL,
    "competitiveGap" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogTopicResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordSuggestionCache" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "topicIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordSuggestionCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogTopicResearch_shop_idx" ON "BlogTopicResearch"("shop");

-- CreateIndex
CREATE INDEX "BlogTopicResearch_category_idx" ON "BlogTopicResearch"("category");

-- CreateIndex
CREATE INDEX "KeywordSuggestionCache_shop_idx" ON "KeywordSuggestionCache"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordSuggestionCache_shop_key" ON "KeywordSuggestionCache"("shop");
