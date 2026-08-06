# pagamentoapp

App de e-commerce (carrinho + checkout) com pagamento via Mercado Pago
(Checkout Bricks). Stack: Next.js (App Router) + Prisma + PostgreSQL (Supabase)
+ NextAuth (credentials) + Tailwind CSS.

## Stack

- Next.js 16 (App Router) + TypeScript
- Prisma ORM 7 + PostgreSQL
- NextAuth.js v5 (Auth.js) — cadastro/login por email e senha
- Mercado Pago: `mercadopago` (server) + `@mercadopago/sdk-react` (Payment Brick)
- Tailwind CSS

## Setup

### 1. Variáveis de ambiente

Copie/edite o arquivo `.env` na raiz com:

```
DATABASE_URL="postgresql://..."          # connection string do Postgres (ver seção Banco de dados)
NEXTAUTH_SECRET="..."                    # gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_URL="http://localhost:3000"
MP_ACCESS_TOKEN="..."                    # Mercado Pago > Suas integrações > Credenciais de teste
NEXT_PUBLIC_MP_PUBLIC_KEY="..."          # idem, Public Key de teste
MP_WEBHOOK_SECRET="..."                  # Suas integrações > Webhooks > Configurar notificações > Chave secreta
```

Credenciais de teste do Mercado Pago: painel de desenvolvedores em
https://www.mercadopago.com.br/developers/panel → sua aplicação → **Credenciais de teste**.
O `MP_WEBHOOK_SECRET` fica na mesma aplicação, em **Webhooks > Configurar
notificações**, e é obrigatório: a rota de webhook rejeita (401) qualquer
notificação cuja assinatura HMAC não bata com esse segredo.

### 2. Banco de dados (Supabase Postgres)

O projeto usa um Postgres hospedado no Supabase. Na connection string, prefira o
**Transaction pooler** (porta `6543`, host `*.pooler.supabase.com`) em vez da
conexão direta (porta `5432`) — a conexão direta usa IPv6, que pode não
funcionar em algumas redes. Adicione `?pgbouncer=true` ao final da URL.

Rodar as migrations:

```bash
npx prisma migrate dev
```

Se a rede não conseguir alcançar o Postgres diretamente (erro `P1001`), rode o
SQL manualmente pelo **SQL Editor** do painel do Supabase — o SQL de cada
migration fica em `prisma/migrations/<pasta>/migration.sql`. Depois, sincronize
o histórico do Prisma com:

```bash
npx prisma migrate resolve --applied <nome_da_pasta_da_migration>
```

### 3. Seed de produtos

```bash
npx prisma db seed
```

Alternativa (mesma rede sem acesso direto ao banco): rode `prisma/seed.sql`
pelo SQL Editor do Supabase.

### 4. Rodar em desenvolvimento

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Fluxo da aplicação

1. Cliente cria conta em `/cadastro` (ou entra em `/login`).
2. Navega pelo catálogo (`/`), abre um produto (`/produtos/[id]`) e adiciona ao carrinho.
3. Revisa o carrinho em `/carrinho`.
4. Finaliza a compra em `/checkout`, preenchendo o formulário do Payment Brick
   (cartão, Pix ou boleto).
5. `POST /api/payments` cria o `Order` (status `PENDING`) e processa o
   pagamento via SDK do Mercado Pago.
6. `POST /api/webhooks/mercadopago` recebe atualizações assíncronas de status
   (essencial para Pix/boleto). A rota valida a assinatura HMAC da notificação
   (`x-signature`/`x-request-id` contra `MP_WEBHOOK_SECRET`) e, mesmo assim,
   nunca confia no corpo da requisição para decidir o status: sempre busca o
   pagamento de novo via `payment.get({ id })` na API do Mercado Pago antes de
   atualizar o pedido.
7. O cliente acompanha o status em `/pedidos` e `/pedidos/[id]`.

### Estoque, carrinho e retentativa de pagamento

Toda mudança de status de pedido passa por `lib/orders.ts#syncOrderStatus`,
que é idempotente (pedidos em estado final `APPROVED`/`REJECTED` não são
reprocessados, então um webhook duplicado do Mercado Pago não decrementa
estoque duas vezes):

- O estoque de cada produto só é decrementado quando o pedido é confirmado
  como `APPROVED` (nunca na criação, que começa `PENDING`).
- O carrinho só é esvaziado quando o pedido é aprovado — se o pagamento for
  recusado (`REJECTED`), o carrinho permanece intacto e o cliente pode tentar
  pagar de novo (ex: outro cartão) em `/checkout` sem remontar os itens.

## Testando pagamentos

Use os [cartões de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/test/cards)
para simular aprovação/recusa. Para testar o webhook localmente, exponha o
`localhost` com uma ferramenta como `ngrok` e configure `NEXTAUTH_URL` com a
URL pública temporariamente (ou configure a notification URL diretamente no
painel do Mercado Pago).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npx prisma studio` — explorar o banco de dados
