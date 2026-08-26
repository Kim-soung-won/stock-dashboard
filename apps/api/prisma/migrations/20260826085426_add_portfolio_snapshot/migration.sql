-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "totalValue" INTEGER NOT NULL,
    "totalProfitLossRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_seasonId_createdAt_idx" ON "PortfolioSnapshot"("seasonId", "createdAt");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_participantId_createdAt_idx" ON "PortfolioSnapshot"("participantId", "createdAt");
