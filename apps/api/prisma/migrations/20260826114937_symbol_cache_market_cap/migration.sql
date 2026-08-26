-- AlterTable
ALTER TABLE "SymbolCache" ADD COLUMN     "lastPrice" INTEGER,
ADD COLUMN     "listCount" BIGINT,
ADD COLUMN     "marketCap" BIGINT;

-- CreateIndex
CREATE INDEX "SymbolCache_market_marketCap_idx" ON "SymbolCache"("market", "marketCap");
