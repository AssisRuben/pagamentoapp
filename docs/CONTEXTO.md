# Handoff: App de vendas (e-commerce) — Farmácias Conviva

Documento gerado a partir do projeto `farmapp` (app interno de gestão) em 2026-08-07, pra dar ponto de partida ao projeto novo de vendas online pro cliente final.

**Sobre segredos**: os valores REALMENTE secretos (token da Trier, service_role do Supabase) não vivem em nenhum arquivo deste repositório — só dentro do n8n (Credentials) e do painel do Supabase. Não consigo reproduzi-los aqui porque não tenho acesso a eles; abaixo digo exatamente onde pegar cada um.

---

## 1. Decisão que falta tomar antes de começar

**Reaproveitar o Supabase existente (`ggzuchqfepjbsyadfcnk`) ou criar um projeto novo?**

- **A favor de reaproveitar**: `produto_catalogo` já está sincronizado (nome, preço, custo, estoque, categoria/grupo, `tipo_lista` pra saber o que exige receita) — o app de vendas só precisa LER essa tabela, não duplicar sincronização nenhuma.
- **A favor de projeto novo**: separa o "banco de gestão interna" (dados de vendedor/comissão/margem, sensível) do "banco de loja pública" (pedidos de cliente, exposto a mais gente/tráfego). Evita que um bug de RLS no app novo vaze dado interno.
- Minha recomendação, se quiser uma: **reaproveitar o mesmo projeto Supabase**, mas criar tabelas NOVAS pra pedido/carrinho (`pedidos_ecommerce`, `pedido_itens`, etc.) com RLS própria, só lendo `produto_catalogo` (não escrevendo nela). Mais simples que sincronizar catálogo duas vezes.

## 2. API Trier SGF — o que já sabemos

- **Gateway**: `https://api-sgf-gateway.triersistemas.com.br/sgfpod1` (não é IP da farmácia — é um gateway hospedado pela própria Trier; roteia pelo `cod_farmacia`/`cod_filial` embutido no JWT). **Falta o segmento `/rest/` antes de `/integracao/...` pra funcionar** (a doc oficial não deixa isso claro — sem ele, dá 404). URL completa real: `https://api-sgf-gateway.triersistemas.com.br/sgfpod1/rest/integracao/...`.
- **CNPJ homologado**: 63396709000178 (`cod_farmacia` 13040, `cod_filial` 1).
- **Auth**: header `Authorization: Bearer <token>`. Token não expira na prática (`exp` em 2100).
  - **Onde pegar o token**: n8n → Credentials → **"SGF Trier - Bearer"** → copiar o header value (é o mesmo token, sem precisar pedir de novo pra Trier).
- Usar sempre a versão **LTS** ("ESTÁVEL — em produção"), nunca DEV.
- Documentação completa (schemas, todos os endpoints): copiar os arquivos abaixo (seção 4).

### O endpoint que interessa pro app de vendas

```
POST /rest/integracao/venda/ecommerce/efetuar-venda-v1
Authorization: Bearer <token>
Content-Type: application/json
```

Único endpoint de ESCRITA da API relevante pra esse projeto (dos ~100 endpoints do OpenAPI, só 3 são de escrita no total). Registra o pedido como venda no Trier.

**JÁ TESTADO (2026-08-07, 2026-08-12 e 2026-08-16, 22 chamadas reais contra produção — 12 falharam com 500, 10 tiveram sucesso e foram canceladas depois)**. A conclusão final (2026-08-16) é simples: **o único campo obrigatório na prática além do que o schema já documenta é o `enderecoEntrega`** — o `cliente` funciona só com `nome` + `numeroCpfCnpj`, exatamente como o schema sempre disse. **Ver [`API-SGF-EFETUAR-VENDA.md`](API-SGF-EFETUAR-VENDA.md) para a receita completa e o ponto ainda em aberto sobre emissão de nota fiscal.** O payload simplificado abaixo (mantido aqui só como referência histórica do que a doc oficial sugere) **não funciona sozinho** sem `enderecoEntrega`, retorna 500.

Corpo (`VendaEcommerceIntegracaoDto`) — versão simplificada da doc oficial, **incompleta na prática**:

```jsonc
{
  "numeroPedido": "PED-20260001",       // seu número de pedido, obrigatório
  "dataPedido": "2026-08-07T14:30:00-0300", // obrigatório
  "valorTotalVenda": 149.90,             // obrigatório, > 0
  "valorFrete": 10.00,
  "entrega": false,                      // funciona true OU false — ver notas
  "cliente": {                           // ClienteEcommerceIntegracaoDto — precisa vir COMPLETO na prática, ver notas
    "nome": "Fulano da Silva",           // obrigatório
    "numeroCpfCnpj": "145.440.400-00",   // obrigatório
    "email": "cliente@exemplo.com",
    "fone": "(85)99999-9999",
    "cep": "60000000",
    "estado": "CE",
    "logradouro": "...",
    "numeroEndereco": "...",
    "bairro": "...",
    "dataNascimento": "1990-05-12"       // campo que resolvemos: só existe AQUI, não em ClienteIntegracaoDto (leitura)
  },
  "produtos": [                          // VendaItemEcommerceIntegracaoDto[]
    {
      "codigoProduto": 12345,            // bate com produto_catalogo.codigo
      "nomeProduto": "Dipirona 500mg",   // max 30 caracteres!
      "quantidade": 2,
      "valorUnitario": 8.90,
      "valorDesconto": 0
    }
  ],
  "pagamento": {                         // PagamentoIntegracaoDto
    "pagamentoRealizado": true,          // marca como já pago (confirmado via Mercado Pago antes de chamar isso)
    "valorParcela": 149.90
  },
  "vendedor": { "codigo": 5, "nome": "Terezinha" } // opcional de verdade — não usar em venda de e-commerce
}
```

Resposta: `VendaEcommerceIntegracaoRetDto` (200 = sucesso), 400/401/500 nos erros. **Payload real que funciona: ver `docs/API-SGF-EFETUAR-VENDA.md`.**

**Fluxo recomendado**: carrinho no app → checkout no Mercado Pago → webhook do Mercado Pago confirma pagamento aprovado → SÓ ENTÃO chama esse endpoint com `pagamentoRealizado: true`. Nunca registrar a venda no Trier antes do pagamento confirmado.

### Atenção regulatória (ANVISA)

`produto_catalogo.tipo_lista` já classifica cada produto:
- `null`/vazio = venda livre.
- `'T'` = antimicrobiano (retenção de receita).
- outro valor (`A1-A3`, `B1-B2`, `C1-C5`) = controle especial (psicotrópico etc.).

Produto com `tipo_lista` preenchido **não pode simplesmente ir pro carrinho igual aos outros** — precisa de conferência de receita (upload de foto + validação humana, provavelmente) antes de liberar a venda. Isso é decisão de produto/jurídica, não só técnica — não pular essa parte.

## 3. Supabase — dados não-secretos (podem ir direto no `.env` do projeto novo se for reaproveitar o mesmo projeto)

```
EXPO_PUBLIC_SUPABASE_URL=https://ggzuchqfepjbsyadfcnk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnenVjaHFmZXBqYnN5YWRmY25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODY2NzYsImV4cCI6MjA3MDY2MjY3Nn0.ZjOyNsoG2PZPMAJupfWl1-gZ6t383uAqo870jRdME1U
```
(a anon key é segura de expor no cliente — protegida pela RLS de cada tabela; é assim que o app de gestão já usa.)

**service_role key** (só seria necessária se o app novo tiver um backend próprio escrevendo direto, tipo o coletor tem) — **NÃO está em nenhum arquivo**. Pegar em: Supabase dashboard → projeto → Settings → API → "service_role" (secret). Trata como senha, nunca vai pro app mobile nem pro git.

Se decidir reaproveitar o projeto: a tabela relevante pra copiar/consultar é `produto_catalogo` (`supabase/schema.sql`, tabela completa com nome/preço/custo/estoque/categoria/grupo/`tipo_lista`).

## 4. Arquivos de referência da API Trier neste repositório

Já copiados pra raiz do projeto (`api-sgf-openapi.json`, `api-sgf.pdf`,
`api-pdv.pdf`) — atualização em relação à recomendação original deste
documento: **a API PDV acabou sendo útil**, mesmo não sendo usada
diretamente por este app. Ela documenta um fluxo em 3 passos
(`efetuar-venda-v1` → `finalizar-venda-v1` → `emitir-nota-v1`) que ajudou a
entender por que `efetuar-venda-v1` do gateway SGF deixa a venda como
PENDENTE sem gerar nota — ver `docs/API-SGF-EFETUAR-VENDA.md` para os
detalhes.

Este arquivo (`docs/CONTEXTO.md`) é a versão já copiada do handoff original
do projeto `farmapp` — não precisa mais copiar nada, já está tudo aqui.

## 5. Mercado Pago

Nada foi integrado ou pesquisado a fundo ainda neste projeto — é só a ideia discutida. Pra próxima etapa, quando for de fato implementar: Checkout Pro (mais simples, redireciona pra página do Mercado Pago) ou Checkout Transparente (mais controle, mais complexo) — e um webhook (`/notificacoes` do Mercado Pago) que confirma pagamento aprovado antes de chamar o `efetuar-venda-v1` da Trier.

## 6. Se o app novo precisar de push/build própria (EAS)

O projeto atual tem seu próprio EAS project (`63522966-036e-4ceb-a818-a1ea627842e9`, app id `com.conviva.farmacias`) — **isso NÃO transfere pro app novo** se for um app Android separado (application id diferente). Pra push funcionar no app novo, vai precisar: `eas init` criando um projeto EAS próprio + um projeto Firebase próprio (mesmo passo a passo que fizemos aqui, mas gerando credenciais novas — a chave `.json` do Firebase que usamos aqui é específica do pacote `com.conviva.farmacias`, não reaproveita).
