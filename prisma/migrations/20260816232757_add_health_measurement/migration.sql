-- CreateEnum
CREATE TYPE "HealthMeasurementType" AS ENUM ('PRESSAO', 'PESO', 'GORDURA', 'GLICEMIA');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "healthCheckType" "HealthMeasurementType";

-- CreateTable
CREATE TABLE "HealthMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "HealthMeasurementType" NOT NULL,
    "pressaoSistolica" INTEGER,
    "pressaoDiastolica" INTEGER,
    "pesoKg" DOUBLE PRECISION,
    "percentualGordura" DOUBLE PRECISION,
    "glicemiaMgDl" INTEGER,
    "local" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthMeasurement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HealthMeasurement" ADD CONSTRAINT "HealthMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMeasurement" ADD CONSTRAINT "HealthMeasurement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
