-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('MEDICAMENTO', 'PRODUTO');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT 'PRODUTO';

-- AlterTable (referralCode adicionada nullable primeiro pra poder
-- preencher as linhas existentes antes de travar NOT NULL + UNIQUE)
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- Preenche referralCode dos usuários já existentes com um valor único
UPDATE "User" SET "referralCode" = substr(md5(random()::text || id), 1, 8)
WHERE "referralCode" IS NULL;

ALTER TABLE "User" ALTER COLUMN "referralCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
