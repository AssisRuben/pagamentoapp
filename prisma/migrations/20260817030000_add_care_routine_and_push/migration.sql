-- CreateEnum
CREATE TYPE "CareCategory" AS ENUM ('TREINO', 'ALIMENTACAO', 'ESTUDOS', 'MEDICACAO', 'TERAPIA', 'OUTRO');

-- AlterTable
ALTER TABLE "CareChecklistItem" ADD COLUMN     "category" "CareCategory" NOT NULL DEFAULT 'OUTRO',
ADD COLUMN     "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "timeOfDay" TEXT;

-- CreateTable
CREATE TABLE "CareReminderDispatch" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareReminderDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareReminderDispatch_itemId_date_key" ON "CareReminderDispatch"("itemId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- AddForeignKey
ALTER TABLE "CareReminderDispatch" ADD CONSTRAINT "CareReminderDispatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CareChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

