-- AlterTable
ALTER TABLE "TimelineEvent" ADD COLUMN     "sharedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TimelineEvent_sharedAt_idx" ON "TimelineEvent"("sharedAt");

