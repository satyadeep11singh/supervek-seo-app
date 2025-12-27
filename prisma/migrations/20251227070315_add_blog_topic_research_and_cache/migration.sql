-- CreateTable
CREATE TABLE "BlogTopicResearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KeywordSuggestionCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "topicIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BlogTopicResearch_shop_idx" ON "BlogTopicResearch"("shop");

-- CreateIndex
CREATE INDEX "BlogTopicResearch_category_idx" ON "BlogTopicResearch"("category");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordSuggestionCache_shop_key" ON "KeywordSuggestionCache"("shop");

-- CreateIndex
CREATE INDEX "KeywordSuggestionCache_shop_idx" ON "KeywordSuggestionCache"("shop");
