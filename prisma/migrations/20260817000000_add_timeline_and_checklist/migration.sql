-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('ACHIEVEMENT_WEIGHT', 'ACHIEVEMENT_PRESSURE', 'ACHIEVEMENT_CARE_COMPLETE');

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareChecklistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareChecklistCompletion" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareChecklistCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimelineEvent_userId_occurredAt_idx" ON "TimelineEvent"("userId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CareChecklistCompletion_itemId_date_key" ON "CareChecklistCompletion"("itemId", "date");

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareChecklistItem" ADD CONSTRAINT "CareChecklistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareChecklistCompletion" ADD CONSTRAINT "CareChecklistCompletion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CareChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

