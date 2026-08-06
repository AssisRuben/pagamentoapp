import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const products = [
  {
    name: "Fone de Ouvido Bluetooth",
    description: "Fone sem fio com cancelamento de ruído e 30h de bateria.",
    priceCents: 24900,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    stock: 50,
  },
  {
    name: "Mochila para Notebook",
    description: "Mochila resistente à água, compartimento para notebook até 15.6\".",
    priceCents: 15900,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
    stock: 30,
  },
  {
    name: "Garrafa Térmica 1L",
    description: "Mantém a temperatura por até 12 horas. Aço inoxidável.",
    priceCents: 8900,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600",
    stock: 100,
  },
  {
    name: "Teclado Mecânico",
    description: "Teclado mecânico RGB com switches azuis.",
    priceCents: 34900,
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600",
    stock: 20,
  },
  {
    name: "Mouse sem Fio",
    description: "Mouse ergonômico com sensor de alta precisão.",
    priceCents: 9900,
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600",
    stock: 60,
  },
  {
    name: "Suporte para Notebook",
    description: "Suporte ajustável em alumínio, melhora a ergonomia.",
    priceCents: 12900,
    imageUrl: "https://images.unsplash.com/photo-1589561253898-768105ca91a8?w=600",
    stock: 40,
  },
];

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: product,
      create: product,
    });
  }
  console.log(`Seed concluído: ${products.length} produtos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
