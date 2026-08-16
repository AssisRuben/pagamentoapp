-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "codigoProduto" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Product_codigoProduto_key" ON "Product"("codigoProduto");
