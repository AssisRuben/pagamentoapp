import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/lib/generated/prisma/client";
import { efetuarVendaTrier } from "@/lib/trier";

export function mapMpStatusToOrderStatus(
  mpStatus: string | undefined
): OrderStatus {
  if (mpStatus === "approved") return "APPROVED";
  if (mpStatus === "rejected" || mpStatus === "cancelled") return "REJECTED";
  return "PENDING";
}

function farmaciaEnderecoEntrega() {
  return {
    logradouro: process.env.TRIER_FARMACIA_LOGRADOURO!,
    numero: process.env.TRIER_FARMACIA_NUMERO,
    bairro: process.env.TRIER_FARMACIA_BAIRRO!,
    cidade: process.env.TRIER_FARMACIA_CIDADE!,
    estado: process.env.TRIER_FARMACIA_ESTADO!,
    cep: process.env.TRIER_FARMACIA_CEP,
  };
}

/**
 * Envia o pedido aprovado para o Trier (efetuar-venda-v1). Nunca lança — se
 * der qualquer erro (rede, produto sem codigoProduto, etc.), grava o erro em
 * `trierError` e retorna, sem reverter a aprovação do pagamento: o cliente
 * já pagou, o pedido não pode sumir por instabilidade de um sistema
 * terceiro. Reprocessamento de falhas fica manual por enquanto.
 */
async function submeterVendaTrier(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, user: true },
  });
  if (!order) return;

  const itemSemCodigo = order.items.find((item) => !item.product.codigoProduto);
  if (itemSemCodigo) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        trierError: `Produto "${itemSemCodigo.product.name}" não tem codigoProduto (Trier) cadastrado.`,
      },
    });
    return;
  }
  if (!order.user.cpf) {
    await prisma.order.update({
      where: { id: order.id },
      data: { trierError: "Usuário sem CPF cadastrado." },
    });
    return;
  }

  const isDelivery = order.fulfillmentType === "DELIVERY";
  const enderecoEntrega = isDelivery
    ? {
        logradouro: order.addressLogradouro!,
        numero: order.addressNumero ?? undefined,
        bairro: order.addressBairro!,
        cidade: order.addressCidade!,
        estado: order.addressEstado!,
        cep: order.addressCep ?? undefined,
      }
    : farmaciaEnderecoEntrega();

  const vendedorCodigo = process.env.TRIER_VENDEDOR_CODIGO;
  const vendedorNome = process.env.TRIER_VENDEDOR_NOME;
  const vendedor =
    order.user.vendedorAttributed && vendedorCodigo && vendedorNome
      ? { codigo: Number(vendedorCodigo), nome: vendedorNome }
      : undefined;

  try {
    const resultado = await efetuarVendaTrier({
      numeroPedido: order.id,
      dataPedido: order.createdAt,
      valorTotalCents: order.totalCents,
      clienteNome: order.user.name,
      clienteCpf: order.user.cpf,
      entrega: isDelivery,
      enderecoEntrega,
      produtos: order.items.map((item) => ({
        codigoProduto: item.product.codigoProduto!,
        nomeProduto: item.product.name,
        quantidade: item.quantity,
        valorUnitarioCents: item.unitPriceCents,
      })),
      vendedor,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        trierNumeroNota: resultado.numeroNota,
        trierSyncedAt: new Date(),
        trierError: null,
      },
    });
  } catch (error) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        trierError: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

/**
 * Aplica uma mudança de status ao pedido de forma idempotente: pedidos em
 * estado final (APPROVED/REJECTED) não são reprocessados, o que evita
 * decrementar estoque duas vezes quando o Mercado Pago reenvia o mesmo
 * webhook. O estoque só é debitado e o carrinho só é esvaziado quando o
 * pedido é de fato aprovado.
 */
export async function syncOrderStatus(
  orderId: string,
  status: OrderStatus,
  mpPaymentId?: string
) {
  const jaProcessado = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) return true;
    if (order.status === "APPROVED" || order.status === "REJECTED") {
      return true;
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status, mpPaymentId },
    });

    if (status === "APPROVED") {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      const cart = await tx.cart.findUnique({
        where: { userId: order.userId },
      });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      for (const item of order.items) {
        if (!item.product.healthCheckType) continue;
        await tx.healthMeasurement.create({
          data: {
            userId: order.userId,
            type: item.product.healthCheckType,
            local: "Farmácia Conviva",
            measuredAt: order.createdAt,
            orderId: order.id,
          },
        });
      }
    }

    return false;
  });

  if (!jaProcessado && status === "APPROVED") {
    await submeterVendaTrier(orderId);
  }
}
