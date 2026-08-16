const TRIER_API_BASE_URL = process.env.TRIER_API_BASE_URL!;
const TRIER_API_TOKEN = process.env.TRIER_API_TOKEN!;

function trierUrl(path: string) {
  return `${TRIER_API_BASE_URL}/rest/integracao${path}`;
}

function trierHeaders() {
  return {
    Authorization: `Bearer ${TRIER_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

// Formato exigido pelo Trier: yyyy-MM-dd'T'HH:mm:ssZ (offset numérico, ex.
// -0300). Usamos UTC (+0000) em vez de converter pro fuso da farmácia — é
// um offset válido e evita lidar com fuso/horário de verão aqui.
function formatTrierDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "+0000");
}

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Verifica se já existe cliente cadastrado no Trier com esse CPF — usado só
 * uma vez, no primeiro pedido de cada usuário, pra decidir se a venda deve
 * ser atribuída ao vendedor (comissão). Ver docs/API-SGF-EFETUAR-VENDA.md.
 */
export async function clienteExisteNoTrier(cpf: string): Promise<boolean> {
  const url = new URL(trierUrl("/cliente/obter-v1"));
  url.searchParams.set("numeroCpfCnpj", cpf);
  url.searchParams.set("primeiroRegistro", "0");
  url.searchParams.set("quantidadeRegistros", "1");

  const res = await fetch(url, { headers: trierHeaders() });
  if (!res.ok) {
    throw new Error(
      `Trier cliente/obter-v1 falhou (${res.status}): ${await res.text()}`
    );
  }
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

export type TrierEnderecoEntrega = {
  logradouro: string;
  numero?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string;
};

export type TrierVendaItem = {
  codigoProduto: number;
  nomeProduto: string;
  quantidade: number;
  valorUnitarioCents: number;
};

export type TrierEfetuarVendaInput = {
  numeroPedido: string;
  dataPedido: Date;
  valorTotalCents: number;
  clienteNome: string;
  clienteCpf: string;
  entrega: boolean;
  enderecoEntrega: TrierEnderecoEntrega;
  produtos: TrierVendaItem[];
  vendedor?: { codigo: number; nome: string };
};

export type TrierEfetuarVendaResult = {
  numeroNota: number;
  numeroPedido: string;
  statusPedido: { codigo: string; descricao: string };
};

/**
 * Registra a venda no Trier. Payload segue exatamente a receita validada em
 * docs/API-SGF-EFETUAR-VENDA.md: cliente só com nome+CPF (mínimo do
 * schema), enderecoEntrega sempre presente (único campo extra realmente
 * exigido pelo endpoint, mesmo em retirada).
 */
export async function efetuarVendaTrier(
  input: TrierEfetuarVendaInput
): Promise<TrierEfetuarVendaResult> {
  const body = {
    numeroPedido: input.numeroPedido,
    dataPedido: formatTrierDate(input.dataPedido),
    valorTotalVenda: centsToReais(input.valorTotalCents),
    entrega: input.entrega,
    cliente: {
      nome: input.clienteNome,
      numeroCpfCnpj: input.clienteCpf,
    },
    enderecoEntrega: input.enderecoEntrega,
    produtos: input.produtos.map((item) => ({
      codigoProduto: item.codigoProduto,
      nomeProduto: item.nomeProduto.slice(0, 30),
      quantidade: item.quantidade,
      valorUnitario: centsToReais(item.valorUnitarioCents),
      valorDesconto: 0,
    })),
    pagamento: {
      pagamentoRealizado: true,
      valorParcela: centsToReais(input.valorTotalCents),
    },
    ...(input.vendedor ? { vendedor: input.vendedor } : {}),
  };

  const res = await fetch(trierUrl("/venda/ecommerce/efetuar-venda-v1"), {
    method: "POST",
    headers: trierHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(
      `Trier efetuar-venda-v1 falhou (${res.status}): ${await res.text()}`
    );
  }

  return res.json();
}
