-- CreateEnum
CREATE TYPE "CareLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "duracaoEstimadaDias" INTEGER,
ADD COLUMN     "usoContinuo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CareLink" (
    "id" TEXT NOT NULL,
    "titularId" TEXT NOT NULL,
    "caregiverId" TEXT,
    "inviteCode" TEXT NOT NULL,
    "status" "CareLinkStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "CareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareLink_inviteCode_key" ON "CareLink"("inviteCode");

-- AddForeignKey
ALTER TABLE "CareLink" ADD CONSTRAINT "CareLink_titularId_fkey" FOREIGN KEY ("titularId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareLink" ADD CONSTRAINT "CareLink_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
