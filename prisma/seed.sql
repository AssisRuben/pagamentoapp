-- Seed manual via SQL Editor do Supabase (alternativa ao `npx prisma db seed`,
-- útil enquanto a conexão direta ao banco não estiver disponível nesta rede).
INSERT INTO "Product" ("id", "name", "description", "priceCents", "imageUrl", "stock", "createdAt")
VALUES
  (gen_random_uuid()::text, 'Fone de Ouvido Bluetooth', 'Fone sem fio com cancelamento de ruído e 30h de bateria.', 24900, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', 50, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Mochila para Notebook', 'Mochila resistente à água, compartimento para notebook até 15.6".', 15900, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600', 30, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Garrafa Térmica 1L', 'Mantém a temperatura por até 12 horas. Aço inoxidável.', 8900, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600', 100, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Teclado Mecânico', 'Teclado mecânico RGB com switches azuis.', 34900, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600', 20, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Mouse sem Fio', 'Mouse ergonômico com sensor de alta precisão.', 9900, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600', 60, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Suporte para Notebook', 'Suporte ajustável em alumínio, melhora a ergonomia.', 12900, 'https://images.unsplash.com/photo-1589561253898-768105ca91a8?w=600', 40, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
