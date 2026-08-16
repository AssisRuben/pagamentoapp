# API SGF — `efetuar-venda-v1` (notas de implementação validadas)

Testado em produção nos dias 2026-08-07, 2026-08-12 e 2026-08-16, contra o
gateway real (CNPJ 63.396.709/0001-78, `cod_farmacia` 13040, `cod_filial`
1). **22 chamadas de teste em `efetuar-venda-v1`** — 12 resultaram em erro
500 (nenhuma venda criada) e **10 tiveram sucesso**; todas as 10 foram
canceladas em seguida via `atualizar-status-v1`, e nenhuma delas chegou a
gerar nota fiscal antes do cancelamento (confirmado via `consultar-venda-v1`,
`xmlNfe`/`numeroNotaFiscal` sempre `null`). Além disso, mais 3 chamadas de
teste em `atualizar-status-v1` (tentando `status: "1"`, `"2"`, `"3"`) —
todas rejeitadas com 400, ver seção sobre emissão de nota fiscal abaixo.

**Atualização de 2026-08-16, importante**: uma rodada de testes adicional
revelou que a receita "completa" documentada anteriormente (`cliente` com 14
campos) era **superestimada** — o `cliente` mínimo do próprio schema
(`nome` + `numeroCpfCnpj`) já basta. **O único campo realmente exigido além
do schema documentado é o `enderecoEntrega`** (ver seção abaixo). Toda a
complexidade extra de `cliente` que havia sido registrada aqui nunca foi
necessária — ela só nunca tinha sido isolada corretamente da presença do
`enderecoEntrega` nos testes anteriores.

Este documento existe porque **o comportamento real do endpoint diverge da
documentação Swagger/OpenAPI (`api-sgf-openapi.json` / `api-sgf.pdf`) em
vários pontos**. Sem essas notas, qualquer implementação nova vai bater no
mesmo erro genérico e gastar tempo redescobrindo o que já foi descoberto aqui.

## URL correta

A doc não deixa isso óbvio, mas falta o segmento `/rest/`:

```
POST https://api-sgf-gateway.triersistemas.com.br/sgfpod1/rest/integracao/venda/ecommerce/efetuar-venda-v1
Authorization: Bearer <token>
Content-Type: application/json
```

(Sem o `/rest/`, dá 404. Token de teste: n8n → Credentials → "SGF Trier - Bearer".)

## Comportamento real vs. documentado — o essencial

O schema oficial (`VendaEcommerceIntegracaoDto`) marca `cliente`,
`enderecoEntrega`, `vendedor`, `enviarMaquinaPOS` como opcionais (`?`). **Na
prática, mandar só os campos marcados como obrigatórios no schema
(`numeroPedido`, `dataPedido`, `valorTotalVenda`, `produtos`) — ou qualquer
subconjunto incompleto — retorna sempre:**

```json
{"status":500,"error":"Internal Server Error","message":"Erro ao processar os dados","exception":"java.lang.NullPointerException"}
```

Isso não é erro de validação (não é 400) — é uma exceção não tratada do lado
do Trier. Testamos várias combinações diferentes de payload (17 chamadas ao
todo, log completo no fim deste documento) até achar a receita que funciona
(abaixo). Isso não está reportado/confirmado pela Trier — é comportamento
empírico observado, não documentado oficialmente.

### O único campo que PRECISA estar presente além do schema (confirmado por teste)

- **`enderecoEntrega`** — **obrigatório na prática, mesmo em pedido de
  retirada (`entrega: false`)**. Isso contradiz o schema (campo opcional) e a
  lógica (não devia precisar de endereço de entrega numa retirada), mas
  confirmamos por teste direto: sem `enderecoEntrega`, dá 500 — **mesmo com
  `cliente` schema-mínimo**. Esse é o único fator real; toda a complexidade
  extra de `cliente` que a gente achava necessária (ver histórico abaixo)
  nunca foi.
  - **Workaround pra retirada em loja**: preencher `enderecoEntrega` com o
    **endereço da própria farmácia**, não do cliente — já que o campo é
    obrigatório mas não se aplica semanticamente.

### `cliente` — só precisa do mínimo que o próprio schema já pedia

Confirmado por teste em 2026-08-16: `{ nome, numeroCpfCnpj }` já é
suficiente, **desde que `enderecoEntrega` esteja presente**. Nenhum destes
precisa ir no formulário de cadastro/checkout: `codigoCidade`, `email`,
`cep`, `estado`, `fone`, `bairro`, `logradouro`, `numeroEndereco`, `ativo`,
`grupo`, `empresaConvenio`, `sexo`, `numeroRGIE`, `dataNascimento`,
`celular`. (Ainda pode fazer sentido coletar `email`/`fone` pro uso do
próprio app — só não são exigidos pelo Trier.)

### Campos confirmados como realmente opcionais (testado, não fazem diferença)

- **`vendedor`** — pode omitir. **Não** atribuir vendas de e-commerce a um
  vendedor físico da loja (testamos com e sem, e com dois vendedores
  diferentes — não influencia o erro).
- **`enviarMaquinaPOS`** — pode omitir / `false`. Não influencia o 500.
- **`entrega`** — funciona corretamente como `true` (tele-entrega) ou `false`
  (retirada) — usar o valor certo por pedido. O `"enum": [false]` estranho
  que aparece na spec pode ser ignorado; testamos os dois valores e ambos
  funcionam desde que `enderecoEntrega` esteja presente.
- **`produtos`** — array com pelo menos 1 item (já era obrigatório no
  schema — nunca precisou de nada além disso).
- **`pagamento`** — `{pagamentoRealizado, valorParcela}` funciona
  normalmente, sem exigências extra.

### Histórico — por que o documento antes dizia que `cliente` precisava de 14 campos

As primeiras rodadas de teste (07 e 12/08) sempre testaram "cliente
incompleto" **junto com** "sem `enderecoEntrega`" ao mesmo tempo, e só
depois "cliente completo" **junto com** "`enderecoEntrega` presente". Isso
fez parecer que os dois eram necessários juntos. Só em 2026-08-16, testando
`cliente` mínimo + `enderecoEntrega` isoladamente, ficou claro que
`enderecoEntrega` sozinho já era suficiente. Fica registrado aqui como
lição: **ao isolar causa de bug, testar a combinação inversa também** (o que
antes parecia "opcional mas seguro manter" pode estar mascarando qual campo
é o real responsável).

## Payload de referência (testado, retornou 200 em 2026-08-16)

```json
{
  "numeroPedido": "PED-XXXX",
  "dataPedido": "2026-08-16T16:09:06-0300",
  "valorTotalVenda": 2.00,
  "valorFrete": 0,
  "entrega": false,
  "cliente": {
    "nome": "Nome Completo",
    "numeroCpfCnpj": "000.000.000-00"
  },
  "enderecoEntrega": {
    "logradouro": "endereço da farmácia (retirada) ou do cliente (entrega)",
    "numero": "...",
    "bairro": "...",
    "cidade": "...",
    "estado": "...",
    "cep": "..."
  },
  "produtos": [
    {
      "codigoProduto": 3774,
      "nomeProduto": "SERINGA SR 5ML 25X7 1UN",
      "quantidade": 1,
      "valorUnitario": 2.00,
      "valorDesconto": 0
    }
  ],
  "pagamento": { "pagamentoRealizado": true, "valorParcela": 2.00 }
}
```

Esse é o payload mínimo real — `cliente` não precisa de mais nada além do
que já está aqui. `vendedor` pode ser adicionado (opcional) quando a venda
deve ser atribuída a um vendedor.

## Resposta de sucesso

```json
{"numeroNota":751729,"numeroPedido":"PED-XXXX","statusPedido":{"codigo":"1","descricao":"PENDENTE"}}
```

### ✅ Emissão de nota fiscal — RESOLVIDO (não é gap técnico, é o fluxo esperado)

`efetuar-venda-v1` deixa a venda como **PENDENTE**, sem gerar nota fiscal —
confirmamos via `GET consultar-venda-v1` que `xmlNfe`, `numeroCupomFiscal` e
`numeroNotaFiscal` ficam `null` depois da chamada. Isso bate com o fluxo em 3
passos que a **API PDV** (documento separado, `api-pdv.pdf`) expõe:
`efetuar-venda-v1` → `finalizar-venda-v1` → `emitir-nota-v1` — só que esses
dois últimos passos não existem no gateway SGF (só na API PDV local).

**Confirmamos por teste (2026-08-12) que `atualizar-status-v1` não serve pra
avançar esse status**: tentamos `status: "1"`, `"2"` e `"3"` — todos
rejeitados com `400 "Status inválido: N."`, inclusive o `"1"` (o próprio
código de PENDENTE que o pedido já tinha). Esse endpoint aceita
**exclusivamente `"4"` (cancelar)**; diferente do campo `entrega`, aqui a
doc está certa — não existe, via API, nenhum jeito de confirmar/faturar o
pedido.

**Isso não é um problema a resolver — é o fluxo de negócio pretendido**: o
pedido cai como PENDENTE na tela do PDV físico da farmácia (com
`pagamento.pagamentoRealizado: true` refletindo o Pix já confirmado pelo
Mercado Pago), e **o caixa da farmácia processa manualmente a partir daí** —
separa os itens e despacha pro motoboy. A emissão da nota fiscal acontece do
lado do PDV físico, fora do escopo da integração via API. **O app só precisa
garantir que o pedido chegue certo (produtos, cliente, pagamento marcado como
realizado) até o status PENDENTE — o resto é operação da loja, não código.**

## Cancelamento (usado em todos os testes acima)

```
POST /sgfpod1/rest/integracao/venda/ecommerce/atualizar-status-v1
{ "numeroNota": <retornado>, "numeroPedido": "...", "status": "4" }
```

Retorna `statusPedido: {"codigo":"4","descricao":"CANCELADO"}`.

## Produto usado nos testes

`codigoProduto: 3774` — "SERINGA SR 5ML 25X7 1UN" — R$ 2,00 — estoque real
disponível, `tipo_lista` null (venda livre, sem exigência de receita).

## Log dos testes (referência)

**`efetuar-venda-v1`** — `TESTE-20260807-01` a `06` (6 chamadas, todas 500),
`TESTE-20260812-02` a `13` (12 chamadas: `02`, `08`, `09`, `10`, `11`, `13`
com sucesso/200; `03`, `04`, `05`, `06`, `07`, `12` com 500) e
`TESTE-20260816-01` a `04` (4 chamadas, todas com sucesso/200 — a rodada que
provou que `cliente` schema-mínimo já bastava) — histórico completo de
isolamento campo a campo até chegar na receita real documentada acima.
`numeroNota` das chamadas de sucesso: 751038, 751040, 751041, 751042,
751043, 751047, 751726, 751727, 751728, 751729 — todas as 10 canceladas via
`atualizar-status-v1` logo em seguida.

**`atualizar-status-v1`** — testado com `status: "1"`, `"2"`, `"3"` sobre o
pedido `TESTE-20260812-13` (`numeroNota` 751047): todas as 3 tentativas
retornaram `400 "Status inválido: N."`. Confirma que o endpoint só aceita
`"4"` (cancelar) — não existe transição de status via API além do
cancelamento.
