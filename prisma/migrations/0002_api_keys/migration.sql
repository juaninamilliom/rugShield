CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tier" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE UNIQUE INDEX "ApiKey_keyPrefix_key" ON "ApiKey"("keyPrefix");
CREATE INDEX "ApiKey_tier_active_createdAt_idx" ON "ApiKey"("tier", "active", "createdAt");

CREATE TABLE "ApiKeyUsage" (
  "id" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "chain" TEXT,
  "requestUnits" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKeyUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiKeyUsage_apiKeyId_createdAt_idx" ON "ApiKeyUsage"("apiKeyId", "createdAt");

ALTER TABLE "ApiKeyUsage"
ADD CONSTRAINT "ApiKeyUsage_apiKeyId_fkey"
FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
