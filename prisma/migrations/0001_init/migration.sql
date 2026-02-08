CREATE TABLE "Scan" (
  "id" TEXT NOT NULL,
  "chain" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetValue" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "findingsJson" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "aiModel" TEXT NOT NULL,
  "analysisTimeMs" INTEGER NOT NULL,
  "sourceCodeHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Scan_chain_targetValue_createdAt_idx" ON "Scan"("chain", "targetValue", "createdAt");
