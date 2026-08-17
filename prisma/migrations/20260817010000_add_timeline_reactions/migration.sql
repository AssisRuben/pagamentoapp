-- CreateTable
CREATE TABLE "TimelineReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimelineReaction_userId_itemKey_key" ON "TimelineReaction"("userId", "itemKey");

-- CreateIndex
CREATE INDEX "TimelineComment_userId_itemKey_idx" ON "TimelineComment"("userId", "itemKey");

-- AddForeignKey
ALTER TABLE "TimelineReaction" ADD CONSTRAINT "TimelineReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineComment" ADD CONSTRAINT "TimelineComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

