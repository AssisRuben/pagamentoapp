-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addressBairro" TEXT,
ADD COLUMN     "addressCep" TEXT,
ADD COLUMN     "addressCidade" TEXT,
ADD COLUMN     "addressEstado" TEXT,
ADD COLUMN     "addressLogradouro" TEXT,
ADD COLUMN     "addressNumero" TEXT,
ADD COLUMN     "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
ADD COLUMN     "trierError" TEXT,
ADD COLUMN     "trierNumeroNota" INTEGER,
ADD COLUMN     "trierSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "vendedorAttributed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");
