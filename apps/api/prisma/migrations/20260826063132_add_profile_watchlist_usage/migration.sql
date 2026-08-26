-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "avatarEmoji" TEXT,
ADD COLUMN     "bio" TEXT;

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceUsageLog" (
    "id" TEXT NOT NULL,
    "participantId" TEXT,
    "headerUserId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchlistItem_participantId_createdAt_idx" ON "WatchlistItem"("participantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_participantId_code_key" ON "WatchlistItem"("participantId", "code");

-- CreateIndex
CREATE INDEX "ServiceUsageLog_participantId_createdAt_idx" ON "ServiceUsageLog"("participantId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceUsageLog_path_createdAt_idx" ON "ServiceUsageLog"("path", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceUsageLog_createdAt_idx" ON "ServiceUsageLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
