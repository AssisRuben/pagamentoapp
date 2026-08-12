# API SGF — `efetuar-venda-v1` (notas de implementação validadas)

Testado em produção nos dias 2026-08-07 e 2026-08-12, contra o gateway real
(CNPJ 63.396.709/0001-78, `cod_farmacia` 13040, `cod_filial` 1). **17
chamadas de teste no total** — 12 resultaram em erro 500 (nenhuma venda
criada) e **5 tiveram sucesso** (`numeroNota` 751038, 751040, 751041, 751042,
751043); essas 5 foram canceladas em seguida via `atualizar-status-v1`, e
nenhuma delas chegou a gerar nota fiscal antes do cancelamento (confirmado
via `consultar-venda-v1`, `xmlNfe`/`numeroNotaFiscal` sempre `null`).

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

### Campos que PRECISAM estar presentes (confirmado por teste)

- **`cliente` completo** — não basta `nome` + `numeroCpfCnpj` (que é tudo que
  o schema marca como obrigatório; testamos e falha). O conjunto abaixo,
  testado junto com `enderecoEntrega`, funciona de forma confiável (5/5
  sucessos): `nome`, `numeroCpfCnpj`, `codigoCidade`, `email`, `cep`,
  `estado`, `fone`, `bairro`, `logradouro`, `numeroEndereco`, `ativo`,
  `grupo` (objeto `{codigo, nome}`), `empresaConvenio` (objeto
  `{codigo, nome}`), `sexo`, `numeroRGIE`, `dataNascimento`, `celular`.
  **Ressalva**: não isolamos qual subconjunto exato desses 14 campos é
  realmente necessário — só confirmamos que "mínimo do schema" (2 campos)
  falha e "completo" (14 campos) funciona. É possível que menos campos já
  bastem; trate a lista abaixo como receita conhecida-boa, não como o
  mínimo comprovado.
  - `grupo`: usamos `{codigo: 1, nome: "PADRAO"}` — não confirmamos se há
    mais de um grupo de cliente nessa farmácia; ainda não personalizamos por
    cliente real.
  - `empresaConvenio`: usamos `{codigo: 0, nome: "string"}` — código `0`
    aparenta significar "sem convênio", o que é o caso normal pra cliente de
    e-commerce (sem plano/convênio corporativo vinculado).
- **`enderecoEntrega`** — **obrigatório na prática, mesmo em pedido de
  retirada (`entrega: false`)**. Isso contradiz o schema (campo opcional) e a
  lógica (não devia precisar de endereço de entrega numa retirada), mas
  confirmamos por teste direto: sem `enderecoEntrega`, dá 500 mesmo com
  `cliente` completo.
  - **Workaround pra retirada em loja**: preencher `enderecoEntrega` com o
    **endereço da própria farmácia**, não do cliente — já que o campo é
    obrigatório mas não se aplica semanticamente.
- **`produtos`** — array com pelo menos 1 item (já era obrigatório no schema).
- **`pagamento`** — `{pagamentoRealizado, valorParcela}` funciona normalmente.

### Campos confirmados como realmente opcionais (testado, não fazem diferença)

- **`vendedor`** — pode omitir. **Não** atribuir vendas de e-commerce a um
  vendedor físico da loja (testamos com e sem, e com dois vendedores
  diferentes — não influencia o erro).
- **`enviarMaquinaPOS`** — pode omitir / `false`. Não influencia o 500.
- **`entrega`** — funciona corretamente como `true` (tele-entrega) ou `false`
  (retirada) — usar o valor certo por pedido. O `"enum": [false]` estranho
  que aparece na spec pode ser ignorado; testamos os dois valores e ambos
  funcionam desde que `cliente` e `enderecoEntrega` estejam completos.

## Payload de referência (testado, retornou 200)

```json
{
  "numeroPedido": "PED-XXXX",
  "dataPedido": "2026-08-12T13:00:00-0300",
  "valorTotalVenda": 2.00,
  "valorFrete": 0,
  "entrega": false,
  "cliente": {
    "nome": "Nome Completo",
    "numeroCpfCnpj": "000.000.000-00",
    "codigoCidade": "LAJEADO",
    "email": "cliente@exemplo.com",
    "cep": "60000000",
    "estado": "CE",
    "fone": "(85)99999-9999",
    "bairro": "CENTRO",
    "logradouro": "RUA X",
    "numeroEndereco": "1",
    "ativo": true,
    "grupo": { "codigo": 1, "nome": "PADRAO" },
    "empresaConvenio": { "codigo": 0, "nome": "string" },
    "sexo": "M",
    "numeroRGIE": "1234567890",
    "dataNascimento": "1990-05-12T00:00:00-0300",
    "celular": "(85)90000-0000"
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

## Resposta de sucesso

```json
{"numeroNota":751038,"numeroPedido":"PED-XXXX","statusPedido":{"codigo":"1","descricao":"PENDENTE"}}
```

### ⚠️ Ponto em aberto, importante pra produção

`efetuar-venda-v1` deixa a venda como **PENDENTE**, sem gerar nota fiscal —
confirmamos via `GET consultar-venda-v1` que `xmlNfe`, `numeroCupomFiscal` e
`numeroNotaFiscal` ficam `null` depois da chamada. Isso bate com o fluxo em 3
passos que a **API PDV** (documento separado, `api-pdv.pdf`) expõe:
`efetuar-venda-v1` → `finalizar-venda-v1` → `emitir-nota-v1`. Só que esses
dois últimos passos **não existem/não estão documentados do lado do gateway
SGF** (só existem na API PDV, que roda local na farmácia, endpoints
`/api/venda/...`, não `/integracao/venda/ecommerce/...`).

**Ou seja: ainda não sabemos como a nota fiscal é de fato emitida via SGF.**
Possibilidades a investigar antes de ir pra produção:
1. O SGF emite a nota automaticamente depois de um tempo/evento (assíncrono).
2. Existe uma chamada equivalente a `finalizar-venda-v1`/`emitir-nota-v1` no
   gateway SGF que não está na doc que temos.
3. Precisa mesmo contatar a Trier pra confirmar o fluxo completo.

**Não construir o fluxo de produção em cima da suposição de que
`efetuar-venda-v1` sozinho já fecha a venda.** Testar o ciclo completo
(inclusive geração de nota) antes de expor isso pra cliente real.

## Cancelamento (usado em todos os testes acima)

```
POST /sgfpod1/rest/integracao/venda/ecommerce/atualizar-status-v1
{ "numeroNota": <retornado>, "numeroPedido": "...", "status": "4" }
```

Retorna `statusPedido: {"codigo":"4","descricao":"CANCELADO"}`.

## Produto usado nos testes

`codigoProduto: 3774` — "SERINGA SR 5ML 25X7 1UN" — R$ 2,00 — estoque real
disponível, `tipo_lista` null (venda livre, sem exigência de receita).

## Log dos 17 testes (referência)

`TESTE-20260807-01` a `06` (6 chamadas, todas 500) e `TESTE-20260812-02` a
`12` (11 chamadas: `02`, `08`, `09`, `10`, `11` com sucesso/200; `03`, `04`,
`05`, `06`, `07`, `12` com 500) — histórico completo de isolamento campo a
campo até chegar na receita documentada acima. Todo `numeroNota` retornado
(as 5 chamadas de sucesso) foi cancelado via `atualizar-status-v1` logo em
seguida.
